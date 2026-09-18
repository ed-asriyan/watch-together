import { isExample } from './stores/video-example';

export enum SourceType {
    blob = 'blob',
    direct = 'direct',
    magnet = 'magnet',
    YouTube = 'YouTube',
    Vimeo = 'Vimeo',
}

interface SourceParams {
    src: string;
    type: SourceType;
}

abstract class SourceBuilder {
    protected static type: SourceType;

    abstract parse(r: string): string | null;

    recognize(id: string): SourceParams | null {
        if (!id) return null;
        const url = this.parse(id);
        if (url) {
            // @ts-ignore
            return { src: url, type: this.constructor.type };
        } else {
            return null;
        }
    }
}

abstract class SourceBuilderRegex extends SourceBuilder {
    protected static regex: RegExp;
    protected static type: SourceType;

    abstract parseRegex(r: RegExpMatchArray): string;

    parse(id: string): string | null {
        // @ts-ignore
        const result = id.match(this.constructor.regex);
        if (result) {
            return this.parseRegex(result);
        } else {
            return null;
        }
    }
}

class YouTube extends SourceBuilderRegex {
    protected static regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|live\/|v\/)?)([\w\-]+)(\S+)?$/;
    protected static type = SourceType.YouTube;

    parseRegex(result: RegExpMatchArray): string {
        return `youtube/${result[6]}`
    }
}

class Vimeo extends SourceBuilderRegex {
    protected static regex = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
    protected static type = SourceType.Vimeo;

    parseRegex(result: RegExpMatchArray): string {
        return `vimeo/${result[1]}`;
    }
}

class Magnet extends SourceBuilder {
    protected static type = SourceType.magnet;

    parse(link: string): string | null {
        try {
            const url = new URL(link);
            return url.protocol === "magnet:" ? link : null;
        } catch {
            return null;
        }
    }
}

class Direct extends SourceBuilder {
    protected static type = SourceType.direct;

    parse(link: string): string | null {
        try {
            const url = new URL(link);
            return url.protocol === "http:" || url.protocol === "https:" ? link : null;
        } catch {
            return null;
        }
    }
}

const parsers: SourceBuilder[] = [
    new YouTube(),
    new Vimeo(),
    new Magnet(),
    new Direct(), // direct should always be the last one
];

export class Source implements SourceParams {
    src: string;
    type: SourceType;

    constructor (params: SourceParams) {
        this.src = params.src;
        this.type = params.type;
    }

    isExaple(): boolean {
        return isExample(this);
    }
} 

export default function(src: string | null): Source | null {
    if (!src) {
        return null;
    }

    for (const parser of parsers) {
        const result = parser.recognize(src);
        if (result) return new Source(result);
    }
    return null;
}

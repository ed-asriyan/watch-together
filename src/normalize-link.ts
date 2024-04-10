export enum SourceType {
    direct = 'direct',
    magnet = 'magnet',
    DailyMotion = 'Dailymotion',
    YouTube = 'YouTube',
    Vimeo = 'Vimeo',
}

export interface Link {
    url: string;
    type: SourceType;
}

abstract class LinkBuilder {
    protected static type: SourceType;

    abstract parse(r: string): string | null;

    recognize(id: string): Link | null {
        const url = this.parse(id);
        if (url) {
            // @ts-ignore
            return { url, type: this.constructor.type };
        } else {
            return null;
        }
    }
}

abstract class LinkBuilderRegex extends LinkBuilder {
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

class YouTube extends LinkBuilderRegex {
    protected static regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|live\/|v\/)?)([\w\-]+)(\S+)?$/;
    protected static type = SourceType.YouTube;

    parseRegex(result: RegExpMatchArray): string {
        return `youtube/${result[6]}`
    }
}

class Vimeo extends LinkBuilderRegex {
    protected static regex = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
    protected static type = SourceType.Vimeo;

    parseRegex(result: RegExpMatchArray): string {
        return `vimeo/${result[1]}`;
    }
}

class Dailymotion extends LinkBuilderRegex {
    // https://stackoverflow.com/a/50644701
    protected static regex = /^(?:(?:https?):)?(?:\/\/)?(?:www\.)?(?:(?:dailymotion\.com(?:\/embed)?\/video)|dai\.ly)\/([a-zA-Z0-9]+)(?:_[\w_-]+)?$/;
    protected static type = SourceType.DailyMotion;

    parseRegex(result: RegExpMatchArray): string {
        return result[1];
    }
}

class Magnet extends LinkBuilder {
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

class Direct extends LinkBuilder {
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

const parsers: LinkBuilder[] = [
    new YouTube(),
    new Vimeo(),
    new Dailymotion(),
    new Magnet(),
    new Direct(), // direct should always be the last one
];

export default function(url: string | null): Link | null {
    if (!url) {
        return null;
    }

    for (const parser of parsers) {
        const link = parser.recognize(url);
        if (link) return link;
    }
    return null;
}

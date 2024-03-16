export enum LinkType {
    blob,
    direct,
    YouTube,
    Vimeo,
}

export interface Link {
    url: string;
    type: LinkType;
}

abstract class LinkBuilder {
    protected static type: LinkType;

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
    protected static type: LinkType;

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
    protected static type = LinkType.YouTube;

    parseRegex(result: RegExpMatchArray): string {
        return `youtube/${result[6]}`
    }
}

class Vimeo extends LinkBuilderRegex {
    protected static regex = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
    protected static type = LinkType.Vimeo;

    parseRegex(result: RegExpMatchArray): string {
        return `vimeo/${result[1]}`;
    }
}


class Direct extends LinkBuilder {
    protected static type = LinkType.direct;

    parse(link: string): string | null {
        try {
            const url = new URL(link);
            return url.protocol === "http:" || url.protocol === "https:" ? link : null;
        } catch {
            return null;
        }
    }
}

class Blob extends LinkBuilder {
    protected static type = LinkType.blob;

    parse(link: string): string | null {
        return link.startsWith("blob:") ? link : null;
    }
}

const parsers: LinkBuilder[] = [
    new Blob(),
    new YouTube(),
    new Vimeo(),
    new Direct(),
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

const youtubeRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|live\/|v\/)?)([\w\-]+)(\S+)?$/;
const vimeoRegex = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;

export default function(link: string): string | null {
    if (!link) {
        return null;
    }

    const youtube = link.match(youtubeRegex);
    if (youtube) {
        return `youtube/${youtube[6]}`;
    }

    const vimeo = link.match(vimeoRegex);
    if (vimeo) {
        return `vimeo/${vimeo[1]}`;
    }

    try {
        const url = new URL(link);
        return url.protocol === "http:" || url.protocol === "https:" ? link : null;
    } catch {
        return null;
    }
}

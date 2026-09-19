/**
 * Placeholder for a function whose contract is specified by tests but whose
 * body has not been written yet.
 *
 * The signatures were ambient declarations (`export declare function`), which
 * emit no JavaScript — so importing one from a test produced a module-link
 * error rather than a meaningful failure. These throw instead, which makes the
 * whole suite executable and every unimplemented rule report as one clear red
 * test naming itself.
 *
 * Nothing here decides anything. Deleting a call to this is what implementing
 * looks like; the passing-test count is the progress bar.
 */
export class NotImplemented extends Error {
    constructor(what: string) {
        super(`${what} is not implemented yet`);
        this.name = 'NotImplemented';
    }
}

export const notImplemented = (what: string): never => {
    throw new NotImplemented(what);
};

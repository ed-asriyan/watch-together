type Destructor = () => void;

export class Destructable {
    private readonly destructors: Destructor[] = [];

    protected onDestruct (destructor: Destructor) {
        this.destructors.push(destructor);
    }

    protected registerDependency (destructable: Destructable) {
        this.onDestruct(() => destructable.destruct());
    }

    destruct () {
        while (this.destructors.length) {
            const destructor = this.destructors.pop();
            destructor && destructor();
        }
    }
}

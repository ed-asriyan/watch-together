type Destructor = () => void;

export class Destructable {
    private readonly destructors: Destructor[] = [];

    onDestruct (destructor: Destructor) {
        this.destructors.push(destructor);
    }

    registerDependency (destructable: Destructable) {
        this.onDestruct(() => destructable.destruct());
    }

    destruct () {
        while (this.destructors.length) {
            const destructor = this.destructors.pop();
            destructor && destructor();
        }
    }
}

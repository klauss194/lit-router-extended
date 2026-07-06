import { html, LitElement } from "lit";
import { Navigation } from "lit-router-extended";

export class AppAbout extends LitElement {
    navigation = new Navigation(this);

    render() {
        return html`
            <h1>About</h1>
            <p>
                This is the about page. Lorem Ipsum is simply dummy text of the printing and typesetting industry.
            </p>
            <div>
               <button @click=${() => this.navigation.goback()}>Go Back</button>
            </div>
        `;
    }
}
customElements.define('app-about', AppAbout);


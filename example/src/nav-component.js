import { html, LitElement } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { Navigation } from "lit-router-extended";

export class AppNav extends LitElement {
    navigation = new Navigation(this);

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener(Navigation.event, this.updateOnRouterChange);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener(Navigation.event, this.updateOnRouterChange);
    }

    updateOnRouterChange = () => {
        this.requestUpdate();
    }

    render() {
        return html`
            <nav style="padding: 1rem; background: #eee; margin-bottom: 1rem;">
                <ul style="display: flex; gap: 1rem; list-style: none; margin: 0; padding: 0;">
                    <li>
                        <button
                                class=${classMap({"active": this.navigation.pathname === "/" })}
                                @click=${() => this.navigation.navigate("/")}
                        >Home</button>
                    </li>
                    <li>
                        <button
                                class=${classMap({"active": this.navigation.pathname === "/about" })}
                                @click=${() => this.navigation.navigate("/about")}
                        >About</button>
                    </li>
                    <li>
                        <button
                                class=${classMap({"active": this.navigation.pathname.startsWith("/dashboard") })}
                                @click=${() => this.navigation.navigate("/dashboard")}
                        >Dashboard</button>
                    </li>
                    <li>
                        <button
                                class=${classMap({"active": this.navigation.pathname.startsWith("/users") })}
                                @click=${() => this.navigation.navigate("/users")}
                        >Users</button>
                    </li>
                </ul>
            </nav>
        `;
    }
}

customElements.define('app-nav', AppNav);
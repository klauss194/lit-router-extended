# lit-router-extended - actively maintained & used 
A fork of the original Lit Router (lit-labs router) that was written by Justing ( creator of Lit ) but extended and with modifications inspired by React Router
First Initial Version
- Ranking Scorer Instead of URLPattern ( URLPattern seems quite slow & heavy also not supported yet everywhere )
- Keeps the same philosophy of original @lit-labs/router in terms of rendering & composition
- added a leave() callback <-- this NEEDS MORE TESTING STILL IN TESTING FEATURE 
- goto() Methods updates the URLbar
- EMIT global event on each navigation 
- you can pass params to the goto() method -- >  just to retreive them in the render () method 
- DOES NOT SUPPORT #,? ,& ( url Data) <-- work in progress

# How to use ?
Download the files and import the router just like in the /@lit-labs/router

Here is an example / excerpt form an app BUT original documentation still applies

```   _router = new Router(this, [
      {
          name: "landing",
          path: "/landing",
          render: () => html`<auth-welcome></auth-welcome>`,
          leave:()=>{ console.log(" leaving Landing page ")}
      },
        {
          name: "home",
          path: "/",
          enter: () => {
            if (
              authStore.usrObjndRole.value &&
              authStore.userRole.value === "specialist"
            ) {
              this._router.goto("/specialist/orders");
              return false;
            }else if(!authStore.publicUserRole.value) {
                this._router.goto("/landing");
                return false;
            }
          },
          render: () =>
            authStore.usrObjndRole.value
              ? authStore.userRole.value === "client"
                ? html`<homepage-logged></homepage-logged>`
                : html`<specialist-parent
                    style="height: 100%; display: block"
                  ></specialist-parent>`
              : html`<home-page></home-page>`,
        },
        {
      name: "client",
      path: "/client/*",
      render: () => html`<client-parent></client-parent>`,
      leave: () => {
        console.log(" leaving Client page ");
      },
    },
        {
          name: "specialist",
          path: "/specialist/*",
          render: () =>
            html`<specialist-parent
              style="height: 100%; display: block"
            ></specialist-parent>`,
        },

    {
      name: "login",
      path: "/login",
      render: () =>
        html`<authentication-page type="welcome"></authentication-page>`,
    },
    {
      name: "profile",
      enter: () => {
        if (UserisNOTRole({ role: "specialist" })) {
          console.log("User is not logged in or has wrong role");
          this._router.goto("/");
          return false; //reject the current route
        }
      },
      path: "/profile",
      render: () => html`<specialist-profile-page></specialist-profile-page>`,
    },
    {
      name: "logout",
      path: "/logout",
      render: () => html`<logout-page></logout-page>`,
    },
    {
      path: ":path(.*)",
      render: () => html`<h2>Fallback for non existing links</h2>`,
    },
  ]);``` 


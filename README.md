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


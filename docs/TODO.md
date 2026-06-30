# TODO

## QA

- [x] refactorize all test suites.
- [x] add performance test for complex routes.
- [x] add performance test for largest routes. 
- [x] add integration test for nested routes.
- [x] mock host passed to Routes class for make coverage tests.
- [x] make coverage test for Router.

## Proposals

- [] prepare Router class to handle multiple outlets.
- [] make RoutesManager's methods inmutables.
- [x] diagram + comments on every method that we have so far in the Router, RoutesController
call when ready.
- [x] refactorices imperative router folder.
- [x] rename principal artifacts of lit-router.
- [] adds documentation to the changes made in lit-router code.
- [] (research) implementation portals for render route outside the shadowRoot.
- [] (experiental) add conditional rendering based on 'tail group' for OutletManager.

____

### (TODO) Navigate from leave hook entrer in infinite loops

El router no distingue entre una navegación iniciada desde un hook leave y una navegación normal.
Cuando leave() llama a goto(), se inicia una nueva navegación, que a su vez vuelve a llamar a leave(), repitiendo el ciclo.

Añadir un mecanismo de protección para evitar que goto() se ejecute recursivamente desde dentro de un hook leave.

Usar una bandera interna (_isNavigatingFromLeave) en la clase Routes y/o Router para detectar si la navegación fue disparada desde un hook leave.
Si la bandera está activa, ignorar/redirigir la navegación o lanzar una advertencia.

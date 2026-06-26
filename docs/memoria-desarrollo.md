# Memoria de desarrollo - AppPadel

## 1. Problema

La gestión de turnos de pádel suele resolverse mediante mensajes, llamados o planillas compartidas. Ese método funciona al principio, pero se vuelve difícil de sostener cuando hay varias canchas, muchos horarios y pagos de señas pendientes. Los principales problemas detectados fueron la falta de disponibilidad visible para el jugador, el riesgo de reservas duplicadas y la carga manual para quien administra el club.

AppPadel propone una solución web simple: que el jugador pueda consultar horarios disponibles, reservar una cancha y dejar una seña online, mientras el administrador controla la agenda, los precios, las promociones y los bloqueos de disponibilidad desde un panel.

## 2. Solución implementada

La aplicación se construyó como un MVP funcional con dos tipos de usuario: jugador y administrador. El jugador puede registrarse, iniciar sesión, elegir fecha, cancha y horario, crear una reserva pendiente y continuar con el pago de la seña. El administrador puede revisar la agenda diaria, filtrar reservas, cambiar estados, configurar canchas, modificar horarios, definir precios, crear promociones y bloquear canchas cuando no estén disponibles.

La lógica de negocio contempla turnos de 1 a 15 horas, selección en bloques de 30 minutos, estados de reserva, vencimiento de reservas pendientes de pago, cancelaciones y cálculo de precios con promociones. Para evitar superposiciones, la disponibilidad se calcula considerando reservas existentes, canchas activas, horarios del club y bloqueos administrativos.

## 3. Decisiones técnicas

Se eligió Next.js con App Router porque permite combinar páginas renderizadas en servidor, componentes interactivos y endpoints API dentro del mismo proyecto. Las pantallas que necesitan datos del usuario o del club se renderizan como Server Components, mientras que los selectores de horarios y formularios interactivos usan Client Components.

PocketBase se utiliza para autenticación y persistencia de datos. Esta decisión simplifica el manejo de usuarios, colecciones y registros sin sumar una infraestructura pesada para el alcance del trabajo final. Mercado Pago se incorporó como integración externa significativa para resolver el cobro de señas, con un webhook que permite actualizar el estado del pago y confirmar reservas.

También se agregaron pruebas end-to-end con Playwright para validar la home, la creación de una reserva pendiente y la gestión administrativa básica.

## 4. Uso de inteligencia artificial

La inteligencia artificial se utilizó como copiloto durante varias etapas del desarrollo:

- Ideación del alcance inicial y definición de un MVP viable.
- Organización de entidades como usuarios, canchas, reservas, pagos, promociones y bloqueos.
- Revisión de reglas de negocio para duración de turnos, disponibilidad y estados de reserva.
- Generación y corrección de componentes de interfaz.
- Depuración de errores de build, validaciones y textos visibles.
- Preparación de la documentación final y comparación con el enunciado.

El uso de IA permitió avanzar más rápido, pero las decisiones finales se revisaron manualmente. El principal límite encontrado fue que la IA puede proponer soluciones demasiado amplias; por eso se priorizó mantener un flujo principal claro y demostrable.

## 5. Estado actual y mejoras futuras

La aplicación ya cuenta con un flujo principal funcional: registro, login, consulta de disponibilidad, creación de reserva, pago de seña y administración de turnos. El proyecto compila correctamente y tiene pruebas automatizadas para partes críticas.

Como mejoras futuras quedan resolver definitivamente el certificado HTTPS del despliegue, agregar notificaciones por email o WhatsApp, generar reportes administrativos, permitir cambios de reserva por parte del jugador y mejorar la experiencia mobile con más pruebas visuales.

En conclusión, AppPadel cumple el objetivo del trabajo final porque transforma una necesidad real en una aplicación web publicada, con interfaz navegable, lógica de negocio, persistencia de datos, integración externa y documentación del proceso de desarrollo con IA.

## 6. Link Repo GitHub - Link de la App Publicada
 
 Aplicación publicada: [https://187.77.225.53/]

 GitHub  https://github.com/Javier-Acosta/App-Padel.git

## 7. Cuenta Admin (para el DOncente realizar pruebas)

 
    email: admin.demo@app-padel.test
    
    password: AppPadel123!
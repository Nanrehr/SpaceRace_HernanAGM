//VARIABLES GLOBALES
// ------------------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();

// Monitor de recursos y tiempo
const reloj = new THREE.Clock();
const stats = new Stats();

// VARIABLES PARA DETECCIÓN DE CAÍDAS
const raycaster = new THREE.Raycaster();
const vectorAbajo = new THREE.Vector3(0, -1, 0); // Apunto hacia abajo para saber si me he caido


// Parámetros de movimiento del coche
const velocidadMax = 25; // Velocidad del coche
const velocidadGiro = Math.PI; // Radianes por segundo

// Teclas
const teclas = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

let camera;
let cameraControls;
let pista; // Elementos de la escena que vamos a animar o mover
let coche;

// Variables del HUD
let tiempoJugado = 0;
let contadorCaidas = 0;

// Fin variables globales
// ------------------------------------------------------------------------------------------------


//INIT()
// ------------------------------------------------------------------------------------------------
function init() {
    // Configurar el motor de render
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(new THREE.Color(0x000000)); // Fondo negro por defecto
    renderer.shadowMap.enabled = true; // Activamos las sombras
    document.getElementById('container').appendChild(renderer.domElement);

    // Crear y situar la cámara
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000); // Aumentamos el far (último valor) para ver más lejos en el espacio
    camera.position.set(0, 5, 10);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);

    // Monitor de estadísticas
    stats.showPanel(0);
    document.getElementById('container').appendChild(stats.domElement);

    window.addEventListener('resize', updateAspectRatio);

    crearLuces();
    crearFondoEspacial();
    crearPista();
    crearCoche()

    reloj.start();
    render();
}

//Fin INIT()
// ------------------------------------------------------------------------------------------------

//Funciones para la funcionalidad del juego
// ------------------------------------------------------------------------------------------------

//Función para crear las luces ambientales,
//  darle una vulta porque molaría meter un sol y algún q otro planeta random
function crearLuces() {
    // Luz Ambiental
    const luzAmbiental = new THREE.AmbientLight(0xffffff, 0.4); 
    scene.add(luzAmbiental);

    // Luz Direccional
    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.8);
    luzDireccional.position.set(50, 100, 50);
    scene.add(luzDireccional);
}

//variable para guardar el fondo espacial
let fondoEspacial;

function crearFondoEspacial() {
    // Una esfera enorme
    const geometriaFondo = new THREE.SphereGeometry(500, 64, 64);

    // Material
    const materialFondo = new THREE.MeshBasicMaterial({
        color: 0x050510,
        side: THREE.BackSide, // Para ver el interior de la esfera
        wireframe: false
    });

    // Malla
    fondoEspacial = new THREE.Mesh(geometriaFondo, materialFondo);

    scene.add(fondoEspacial);
    
    // (Opcional por ahora) Generar estrellas pequeñas (Puntos)
    crearEstrellas();
}

// Función extra para crear partículas simulando estrellas
function crearEstrellas() {
    const cantidadEstrellas = 10000;
    const geometriaEstrellas = new THREE.BufferGeometry();
    const posiciones = new Float32Array(cantidadEstrellas * 3); // x, y, z por estrella

    for(let i = 0; i < cantidadEstrellas * 3; i++) {
        // Genera números aleatorios entre -250 y 250
        posiciones[i] = (Math.random() - 0.5) * 500;
    }

    // Le decimos a la geometría dónde están los puntos
    geometriaEstrellas.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));

    // Material para los puntos
    const materialEstrellas = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        transparent: true,
        opacity: 0.8
    });

    // Creamos los puntos
    const estrellas = new THREE.Points(geometriaEstrellas, materialEstrellas);
    scene.add(estrellas);
}

function crearPista() {
    // 1. Definir los "waypoints" o puntos clave del circuito.
    // Puedes cambiar estos números luego para hacer la pista más grande o retorcida.
    const puntos = [
        new THREE.Vector3(0, 0, 0),         // Inicio
        new THREE.Vector3(30, 0, -20),      // Curva 1
        new THREE.Vector3(50, 5, -10),      // Curva 2 (Sube un poco en Y)
        new THREE.Vector3(40, 0, 30),       // Recta larga hacia Curva 3
        new THREE.Vector3(0, -5, 40),       // Curva 4 (Baja un poco)
        new THREE.Vector3(-30, 0, 20),      // Curva 5
        new THREE.Vector3(-20, 0, -10)      // Curva 6 y cierra el circuito
    ];

    // Curva que une todos los puntos
    // El true conecta el último con el primero
    const curva = new THREE.CatmullRomCurve3(puntos, true);

    // Un tubo que envuelve la curva  y luego lo aplastamos
    // Parámetros: curva, detalle, radio de la pista, segmentos radiales, cerrado
    const geometriaPista = new THREE.TubeGeometry(curva, 300, 6, 8, true);

    // Material: Vamos a darle un toque brillante

    //material en un futuro quiero un arcoiris
    const materialPista = new THREE.MeshPhongMaterial({
        color: 0x444444,      
        emissive: 0x330066,     
        shininess: 100       
    });

    pista = new THREE.Mesh(geometriaPista, materialPista);
    
    // EL TRUCO MAGICO: Aplastar el tubo en el eje Y (vertical) 
    // para que deje de ser una tubería y pase a ser una pista de carreras plana.
    pista.scale.set(1, 0.01, 1); 

    // Opcional para ver mejor la forma: pon pista.material.wireframe = true;

    scene.add(pista);
}

function updateAspectRatio() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

function crearCoche() {
    coche = new THREE.Group();

    // El chasis
    const geoChasis = new THREE.BoxGeometry(1, 0.5, 2);
    // Cambiamos el color a algo más "ciberpunk"
    const matChasis = new THREE.MeshPhongMaterial({ color: 0x00ffff }); 
    const chasis = new THREE.Mesh(geoChasis, matChasis);
    coche.add(chasis);

    // La cabina
    const geoCabina = new THREE.BoxGeometry(0.8, 0.4, 0.8);
    const matCabina = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const cabina = new THREE.Mesh(geoCabina, matCabina);
    cabina.position.set(0, 0.4, 0.2);
    coche.add(cabina);
    
    // Luz de Neón debajo del coche
    // Parámetros: color, intensidad, distancia, decaimiento
    const luzNeon = new THREE.PointLight(0x00ffff, 20, 10);
    luzNeon.position.set(0, -0.5, 0); // Debajo del chasis
    coche.add(luzNeon);

    // Faro delantero (SpotLight)
    const faro = new THREE.SpotLight(0xffffff, 1.5, 30, Math.PI / 6, 0.5, 1);
    faro.position.set(0, 0.5, 1); // En el morro del coche
    // El SpotLight necesita un "objetivo" (target) al que apuntar
    const objetivoFaro = new THREE.Object3D();
    objetivoFaro.position.set(0, 0.5, 10); // 10 unidades hacia adelante
    coche.add(objetivoFaro);
    faro.target = objetivoFaro;
    coche.add(faro);

    // Posicionarlo en el inicio de la pista
    coche.position.set(0, 0.5, 0); 
    coche.rotation.set(0, 90, 0);

    scene.add(coche);
}

// Fin funciones de creación de elementos
// ------------------------------------------------------------------------------------------------


//Funciones básicas del juego
// ------------------------------------------------------------------------------------------------

function update() {
    const delta = reloj.getDelta();
    stats.update();

    if (cameraControls) cameraControls.update();

    // Actualizar cronómetro
    tiempoJugado += delta;
    document.getElementById('tiempoHUD').innerText = tiempoJugado.toFixed(1);

    // LÓGICA DE MOVIMIENTO 
    if (coche) {

        if (teclas.ArrowLeft) coche.rotation.y += velocidadGiro * delta; // Gira a la izquierda
        if (teclas.ArrowRight) coche.rotation.y -= velocidadGiro * delta; // Gira a la derecha
        if (teclas.ArrowUp) coche.translateZ(velocidadMax * delta);  // Hacia adelante
        if (teclas.ArrowDown) coche.translateZ(-velocidadMax * delta); // Hacia atrás

        const offset = new THREE.Vector3(0, 4, -7); //Posición cámara!!!
        offset.applyQuaternion(coche.quaternion); // Giramos ese 'offset' para que coincida con la rotación actual del coche
        offset.add(coche.position); // Sumamos la posición del coche para obtener las coordenadas en el mundo real

        // Movemos la cámara suavemente a esa posición
        // El '0.1' es la velocidad a la que la cámara alcanza al coche
        //camera.position.lerp(offset, 0.1); 

        //camera.lookAt(coche.position); // Obligamos a la cámara a mirar siempre al centro del coche

    // SISTEMA ANTICAÍDAS (RAYCASTING)
        // Posicionamos el origen del láser un poquito por encima del centro del coche
        const origenRayo = coche.position.clone();
        origenRayo.y += 1; 

        // Le decimos al raycaster de dónde sale y hacia dónde apunta (hacia abajo)
        raycaster.set(origenRayo, vectorAbajo);

        // Disparamos el láser y vemos si golpea a la variable global 'pista'
        const intersecciones = raycaster.intersectObject(pista);

        // Si la lista de intersecciones está vacía (longitud 0), no hay suelo debajo
        if (intersecciones.length === 0) {
            // ¡Caída libre! Reseteamos la posición y rotación del coche al inicio
            coche.position.set(0, 0.5, 0);
            coche.rotation.set(0, 90, 0);
            
            // Opcional: Si tuvieras un contador de vidas o puntuación, aquí restarías uno.
            console.log("¡Te caíste del circuito!");
            contadorCaidas++;
            document.getElementById('caidasHUD').innerText = contadorCaidas;
        }
    }
}

/**Perfecto, ahora mismo sale así. Te quiero hacer varios planteamientos para organizar un poco como quiero que siga el trabajo */

function render() {
    requestAnimationFrame(render);
    update();                      
    renderer.render(scene, camera);
}

// Fin funciones básicas del juego
// ------------------------------------------------------------------------------------------------


// Eventos de teclado para controlar el coche
window.addEventListener('keydown', (event) => {
    if (teclas.hasOwnProperty(event.code)) {
        teclas[event.code] = true;
    }
});

window.addEventListener('keyup', (event) => {
    if (teclas.hasOwnProperty(event.code)) {
        teclas[event.code] = false;
    }
});

init();
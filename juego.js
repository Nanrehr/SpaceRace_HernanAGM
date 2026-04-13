// 1. VARIABLES GLOBALES BÁSICAS
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
let camera;

// Control de camara
let cameraControls;

//prueba para ver si va

// Monitor de recursos y tiempo
const reloj = new THREE.Clock();
const stats = new Stats();

// Elementos de la escena que vamos a animar o mover
let pista;

// 2. FUNCIÓN DE INICIALIZACIÓN
function init() {
    // a. Configurar el motor de render
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(new THREE.Color(0x000000)); // Fondo negro por defecto
    renderer.shadowMap.enabled = true; // Activamos las sombras
    document.getElementById('container').appendChild(renderer.domElement);

    // b. Crear y situar la cámara
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000); // Aumentamos el far (último valor) para ver más lejos en el espacio
    camera.position.set(0, 5, 10);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);

    // c. Monitor de rendimiento (Stats)
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.getElementById('container').appendChild(stats.domElement);

    // d. Redimensionado de ventana
    window.addEventListener('resize', updateAspectRatio);

    // e. Llamamos a las funciones para crear los elementos
    crearLuces();
    crearFondoEspacial();
    crearPista();

    // Arrancar reloj y bucle
    reloj.start();
    render();
}

function crearLuces() {
    // Luz Ambiental
    const luzAmbiental = new THREE.AmbientLight(0xffffff, 0.4); 
    scene.add(luzAmbiental);

    // Luz Direccional
    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.8);
    luzDireccional.position.set(50, 100, 50);
    scene.add(luzDireccional);
}

// Variable global para la esfera del espacio
let fondoEspacial;

function crearFondoEspacial() {
    // Una esfera enorme
    // Un radio de 500 muy grande
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

    // Un tubo que envuelve la curva  y luego lo aplaamos
    // Parámetros: curva, detalle, radio de la pista, segmentos radiales, cerrado
    const geometriaPista = new THREE.TubeGeometry(curva, 6000, 2, 8, true);

    // 4. Material: Vamos a darle un toque brillante
    const materialPista = new THREE.MeshPhongMaterial({
        color: 0x444444,        // Gris base
        emissive: 0x330066,     // Brillo púrpura propio (estilo neón espacial)
        shininess: 100          // Reflejos
    });

    // 5. Unir geometría y material en la variable global que creamos antes
    pista = new THREE.Mesh(geometriaPista, materialPista);
    
    // 6. EL TRUCO MAGICO: Aplastar el tubo en el eje Y (vertical) 
    // para que deje de ser una tubería y pase a ser una pista de carreras plana.
    pista.scale.set(1, 0.1, 1); 

    // Opcional para ver mejor la forma: pon pista.material.wireframe = true;

    // 7. Añadir a la escena
    scene.add(pista);
}

function updateAspectRatio() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

function update() {
    const delta = reloj.getDelta();
    stats.update();

    //Actualizo la posicion d la camara
    if (cameraControls) cameraControls.update();
    // Aquí irá la lógica de movimiento de la cámara y el coche
}

function render() {
    requestAnimationFrame(render);
    update();                      
    renderer.render(scene, camera);
}

init();
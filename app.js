const USE_BACKEND = false;
const API_URL = 'api_productos.php';

// Base de datos simulada en localStorage

let productos = JSON.parse(localStorage.getItem('inventario_productos')) || [
    {
        id: 1,
        codigo_barras: '1234567890123',
        nombre: 'Laptop HP Pavilion',
        categoria: 'Electrónicos',
        descripcion: 'Laptop HP Pavilion 15" con 8GB RAM',
        stock: 10,
        precio: 599.99,
        stock_minimo: 2
    },
    {
        id: 2,
        codigo_barras: '2345678901234',
        nombre: 'Camiseta Básica',
        categoria: 'Ropa',
        descripcion: 'Camiseta 100% algodón',
        stock: 50,
        precio: 19.99,
        stock_minimo: 10
    },
    {
        id: 3,
        codigo_barras: '3456789012345',
        nombre: 'Silla de Oficina',
        categoria: 'Hogar',
        descripcion: 'Silla ergonómica para oficina',
        stock: 8,
        precio: 149.99,
        stock_minimo: 3
    }
];

let proximoId = Math.max(...productos.map(p => p.id), 0) + 1;
let html5QrCode = null;
let html5QrCodeModal = null;
let scannerEnInicio = false;
let scannerActivo = false;
let solicitudScanner = 0;
let ultimoCodigoEscaneado = '';

function mostrarNotificacion(mensaje, tipo = 'success') {
    let contenedor = document.getElementById('notificacion-toast');

    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'notificacion-toast';
        contenedor.style.position = 'fixed';
        contenedor.style.top = '20px';
        contenedor.style.right = '20px';
        contenedor.style.zIndex = '2000';
        contenedor.style.display = 'flex';
        contenedor.style.flexDirection = 'column';
        contenedor.style.gap = '10px';
        document.body.appendChild(contenedor);
    }

    const alerta = document.createElement('div');
    alerta.textContent = mensaje;
    alerta.style.padding = '12px 18px';
    alerta.style.borderRadius = '8px';
    alerta.style.color = '#fff';
    alerta.style.fontWeight = '600';
    alerta.style.boxShadow = '0 6px 18px rgba(0,0,0,0.15)';
    alerta.style.background = tipo === 'error' ? '#ef4444' : '#10b981';
    alerta.style.opacity = '0';
    alerta.style.transition = 'opacity 0.25s ease';

    contenedor.appendChild(alerta);

    requestAnimationFrame(() => {
        alerta.style.opacity = '1';
    });

    setTimeout(() => {
        alerta.style.opacity = '0';
        setTimeout(() => alerta.remove(), 300);
    }, 2500);
}

/*--------------------------------
    Funciones para usar el backend
---------------------------------*/

// Funciones de navegación
function mostrarTab(tabName){
    //Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Mostrar el contenido seleccionado
    document.getElementById(`content-${tabName}`).classList.add('active');

    // Actualizar estilos de pestañas
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active');
    });

    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Cargar datos si es necesario 
    if(tabName === 'productos'){
        cargarProductos();
    }
}

// Funciones de productos
function cargarProductos(){
    const tbody = document.getElementById('tablaProductos');
    tbody.innerHTML = '';

    //Datos del servidor




    // localStorage
    productos.forEach(producto => {
        const fila = document.createElement('tr');

        const stockClass = producto.stock <= producto.stock_minimo ? 'stock-low' : '';

        fila.innerHTML = `
            <td>${producto.id}</td>
            <td style = "font-family: monospace;">${producto.codigo_barras || 'N/A'}</td>
            <td>${producto.nombre}</td>
            <td>${producto.categoria}</td>
            <td class= "${stockClass}">${producto.stock}</td>
            <td>${producto.precio.toFixed(2)}</td>
            <td>
                <button onclick="editarProducto(${producto.id})" class="btn btn-primary" style="margin-right: 5px; padding: 5px 10px;">
                    &#x1F4DD;
                    Editar
                </button>
                <button onclick="eliminarProducto(${producto.id})" class="btn btn-danger" style="padding: 5px 10px;">
                    &#x274C;
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
    actualizarEstadisticas();
}

function actualizarEstadisticas(){
    const totalProductos = productos.length;
    const valorTotal = productos.reduce((total, producto) => total + (producto.stock * producto.precio), 0);

    document.getElementById('totalProductos').textContent = totalProductos;
    document.getElementById('valorTotal').textContent = valorTotal.toFixed(2);
}

// Formulario de productos
document.getElementById('formProducto').addEventListener('submit', function(e){
    e.preventDefault();

    const codigoBarras = document.getElementById('codigoBarras').value.trim();
    const nombre = document.getElementById('nombreProducto').value.trim();
    const categoria = document.getElementById('categoriaProducto').value;
    const descripcion = document.getElementById('descripcionProducto').value.trim();
    const stock = Number(document.getElementById('stockProducto').value);
    const precio = Number(document.getElementById('precioProducto').value);
    const stockMinimo = Number(document.getElementById('stockMinimo').value);

    if (!codigoBarras || !nombre || Number.isNaN(stock) || Number.isNaN(precio)) {
        mostrarNotificacion('Completa los campos obligatorios', 'error');
        return;
    }

    const nuevoProducto = {
        id: proximoId++,
        codigo_barras: codigoBarras,
        nombre,
        categoria,
        descripcion,
        stock,
        precio,
        stock_minimo: stockMinimo || 0
    };

    if (productos.some(p => p.codigo_barras === nuevoProducto.codigo_barras)) {
        mostrarNotificacion('El código de barras ya existe', 'error');
        return;
    }

    productos.push(nuevoProducto);
    guardarEnLocalStorage();
    mostrarNotificacion('Producto agregado correctamente', 'success');
    limpiarFormulario();
    mostrarTab('productos');
});

function limpiarFormulario(){
    document.getElementById('formProducto').reset();
    document.getElementById('stockMinimo').value = 5;
}

function usarCodigoEscaneado(){
    const codigo = document.getElementById('codigoEscaneado').textContent.trim();
    if (!codigo) {
        mostrarNotificacion('No hay un código escaneado para usar', 'error');
        return;
    }

    document.getElementById('codigoBarras').value = codigo;
    mostrarTab('agregar');
    mostrarNotificacion('Código cargado en el formulario', 'success');
}

function buscarProductos(){
    const termino = document.getElementById('buscarProducto').value.toLowerCase();
    const filas = document.querySelectorAll('#tablaProductos tr');

    filas.forEach(fila => {
        const texto = fila.textContent.toLowerCase();
        if (texto.includes(termino)){
            fila.style.display = '';
        }else{
            fila.style.display = 'none';
        }
    });
}

function buscarProductoPorCodigo(){
    const codigo = document.getElementById('codigoEscaneado').textContent.trim();
    if (!codigo) {
        mostrarNotificacion('No hay ningún código escaneado', 'error');
        return;
    }

    const producto = productos.find(p => p.codigo_barras === codigo);

    if(producto){
        mostrarTab('productos');
        document.getElementById('buscarProducto').value = codigo;
        buscarProductos();
        mostrarNotificacion('Producto encontrado', 'success');
    }else{
        mostrarNotificacion('Producto no encontrado. ¿Deseas agregarlo?', 'error');
        document.getElementById('codigoBarras').value = codigo;
        mostrarTab('agregar');
    }
}

function editarProducto(id){
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    document.getElementById('editarId').value = producto.id;
    document.getElementById('editarNombre').value = producto.nombre;
    document.getElementById('editarStock').value = producto.stock;
    document.getElementById('editarPrecio').value = producto.precio;

    document.getElementById('modalEditar').classList.add('show');
}

function cerrarModal(){
    document.getElementById('modalEditar').classList.remove('show');
}

function abrirScannerRapido(){
    mostrarTab('scanner');
    iniciarScanner();
}

//Backend

//Funciones del scanner
function actualizarEstadoScanner(mensaje){
    document.getElementById('estadoScanner').textContent = mensaje;
}

function describirErrorCamara(error){
    const nombre = error && error.name;

    if (nombre === 'NotAllowedError' || nombre === 'PermissionDeniedError') {
        return 'El navegador bloqueó la cámara. Permite el acceso a la cámara en los permisos del sitio y vuelve a intentarlo.';
    }
    if (nombre === 'NotFoundError' || nombre === 'DevicesNotFoundError') {
        return 'No se encontró una cámara conectada o disponible.';
    }
    if (nombre === 'NotReadableError' || nombre === 'TrackStartError') {
        return 'La cámara está ocupada por otra aplicación. Ciérrala y vuelve a intentarlo.';
    }
    if (nombre === 'OverconstrainedError' || nombre === 'ConstraintNotSatisfiedError') {
        return 'La cámara seleccionada no está disponible. Prueba con otra cámara.';
    }
    if (nombre === 'SecurityError' || !window.isSecureContext) {
        return 'El navegador requiere HTTPS o localhost para acceder a la cámara.';
    }

    return `No se pudo iniciar la cámara${error && error.message ? `: ${error.message}` : '.'}`;
}

async function iniciarScanner(){
    if (typeof Html5Qrcode === 'undefined') {
        mostrarNotificacion('La biblioteca de escaneo no está disponible en este navegador', 'error');
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        mostrarNotificacion('Este navegador no permite usar la cámara. Abre la app desde HTTPS o localhost.', 'error');
        return;
    }

    if (scannerEnInicio || scannerActivo) {
        return;
    }

    scannerEnInicio = true;
    const solicitudActual = ++solicitudScanner;
    ultimoCodigoEscaneado = '';
    document.getElementById('btnIniciarScanner').style.display = 'none';
    document.getElementById('btnDetenerScanner').style.display = 'inline-block';
    document.getElementById('resultadoScan').classList.remove('show');
    actualizarEstadoScanner('Solicitando permiso para usar la cámara...');

    const formatosCodigoBarras = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.AZTEC,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.MAXICODE,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.PDF_417,
        Html5QrcodeSupportedFormats.RSS_14,
        Html5QrcodeSupportedFormats.RSS_EXPANDED,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION
    ];
    const config = {
        fps: 15,
        formatsToSupport: formatosCodigoBarras,
        qrbox: (ancho, alto) => ({
            width: Math.min(ancho, 500),
            height: Math.min(alto, 180)
        })
    };

    let streamPermiso = null;
    try {
        // Request permission directly from the button click before listing cameras.
        streamPermiso = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } }
        });
        if (solicitudActual !== solicitudScanner) {
            streamPermiso.getTracks().forEach(track => track.stop());
            return;
        }
        streamPermiso.getTracks().forEach(track => track.stop());
        streamPermiso = null;

        actualizarEstadoScanner('Buscando cámaras disponibles...');
        const camaras = await Html5Qrcode.getCameras();
        if (solicitudActual !== solicitudScanner) return;

        const selectorCamara = document.getElementById('seleccionCamara');
        const camaraSeleccionada = selectorCamara.value;
        selectorCamara.replaceChildren();
        camaras.forEach((camara, indice) => {
            const opcion = document.createElement('option');
            opcion.value = camara.id;
            opcion.textContent = camara.label || `Cámara ${indice + 1}`;
            selectorCamara.appendChild(opcion);
        });
        const camaraTrasera = camaras.find(camara => /back|rear|environment|trasera|posterior/i.test(camara.label));
        if (camaras.length) {
            const camaraPreferida = camaras.find(camara => camara.id === camaraSeleccionada) ||
                camaraTrasera || camaras[0];
            selectorCamara.value = camaraPreferida.id;
        }
        selectorCamara.hidden = camaras.length < 2;
        document.getElementById('etiquetaCamara').hidden = camaras.length < 2;

        actualizarEstadoScanner('Iniciando cámara...');
        html5QrCode = new Html5Qrcode('reader');
        await html5QrCode.start(
            camaras.length ? selectorCamara.value : { facingMode: { ideal: 'environment' } },
            config,
            (decodedText) => {
                if (decodedText === ultimoCodigoEscaneado) return;
                ultimoCodigoEscaneado = decodedText;
                document.getElementById('codigoEscaneado').textContent = decodedText;
                document.getElementById('resultadoScan').classList.add('show');
                document.getElementById('codigoBarras').value = decodedText;
                actualizarEstadoScanner('Código detectado. Puedes enfocar otro código o detener el escáner.');
                mostrarNotificacion('Código escaneado correctamente', 'success');
            },
            () => {
                // Ignora los errores de lectura intermedios mientras se busca un código.
            }
        );

        if (solicitudActual !== solicitudScanner) {
            await html5QrCode.stop();
            html5QrCode.clear();
            html5QrCode = null;
            return;
        }
        scannerEnInicio = false;
        scannerActivo = true;
        actualizarEstadoScanner('Cámara activa. Centra el código de barras dentro del recuadro.');
    } catch (error) {
        if (streamPermiso) {
            streamPermiso.getTracks().forEach(track => track.stop());
        }
        if (solicitudActual !== solicitudScanner) return;

        html5QrCode = null;
        scannerEnInicio = false;
        scannerActivo = false;
        document.getElementById('btnIniciarScanner').style.display = 'inline-block';
        document.getElementById('btnDetenerScanner').style.display = 'none';
        const mensaje = describirErrorCamara(error);
        actualizarEstadoScanner(mensaje);
        mostrarNotificacion(mensaje, 'error');
    }
}

async function detenerScanner(){
    if (scannerEnInicio) {
        solicitudScanner++;
        scannerEnInicio = false;
        document.getElementById('btnIniciarScanner').style.display = 'inline-block';
        document.getElementById('btnDetenerScanner').style.display = 'none';
        actualizarEstadoScanner('Inicio de cámara cancelado.');
        return;
    }

    if (html5QrCode && scannerActivo) {
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
            html5QrCode = null;
            scannerActivo = false;
            document.getElementById('btnIniciarScanner').style.display = 'inline-block';
            document.getElementById('btnDetenerScanner').style.display = 'none';
            actualizarEstadoScanner('Escáner detenido.');
        } catch (error) {
            html5QrCode = null;
            scannerActivo = false;
            document.getElementById('btnIniciarScanner').style.display = 'inline-block';
            document.getElementById('btnDetenerScanner').style.display = 'none';
            const mensaje = `No se pudo detener el escáner: ${error.message || 'error desconocido'}`;
            actualizarEstadoScanner(mensaje);
            mostrarNotificacion(mensaje, 'error');
        }
    } else {
        document.getElementById('btnIniciarScanner').style.display = 'inline-block';
        document.getElementById('btnDetenerScanner').style.display = 'none';
    }
}

function guardarEnLocalStorage(){
    localStorage.setItem('inventario_productos', JSON.stringify(productos));
}

//Inicialización
document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
});
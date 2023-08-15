import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Draw, Modify, Snap } from 'ol/interaction.js';
import { OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import { get } from 'ol/proj.js';
import WKT from 'ol/format/WKT.js';

const saveParcelBtn = document.getElementById("saveParcel");
const mainEditBtn = document.getElementById("mainEditButton");
const cancelBtn = document.getElementById("cancelBtn");
var wktGeoms;

const raster = new TileLayer({
    source: new OSM(),
});

var format = new WKT();

let source = new VectorSource();
const vector = new VectorLayer({
    source: source,
    style: {
        'fill-color': 'rgba(255, 255, 255, 0.2)',       // Seçim yaptığı alanın rengi.                                  Default: rgba(255, 255, 255, 0.2)
        'stroke-color': '#fa0000',                      // Seçim yaptığı alanın sınır çizgilerinin rengi.               Default: #ffcc33
        'stroke-width': 2,                              // Seçim yaptığı alanın sınır çizgilerinin kalınlığı.           Default: 2
        'circle-radius': 7,                             // Point type olunca haritada bıraktığı darielerin yarıçapı.    Default: 7
        'circle-fill-color': '#ffcc33',                 // Point type olunca haritada bıraktığı darielerin rengi.       Default: #ffcc33
    },
});

// Limit multi-world panning to one world east and west of the real world.
// Geometry coordinates have to be within that range.
const extent = get('EPSG:3857').getExtent().slice();
extent[0] += extent[0];
extent[2] += extent[2];
const map = new Map({
    layers: [raster, vector],
    target: 'map',
    view: new View({
        center: [0, 0],                     // Harita ilk açıldığında karşımıza çıkan konum
        zoom: 2,                                        // Harita ilk açıldığında zoom miktarı
        extent,
    }),
});

const modify = new Modify({ source: source });
map.addInteraction(modify);

let draw, snap; // global so we can remove them later
const typeSelect = document.getElementById('type');

function addInteractions() {
    draw = new Draw({
        source: source,
        type: typeSelect.value,
    });
    map.addInteraction(draw);
    snap = new Snap({ source: source });
    map.addInteraction(snap);
    draw.addEventListener("drawend", onDrawEnd);            // çizme işlemi bitince tetiklenecek

}

// TABLONUN VERİTABANINA GÖRE KENDİNİ DOLDURMASI
function tableRefresh() {
    var tablo = document.getElementById("table");
    $.ajax({
        url: "https://localhost:44384/api/Parcel/getall",
        method: "GET",
        success: function (parcels) {
            // Veri başarıyla alındığında yapılacak işlemler
            console.log(parcels);
            $("#table").empty();

            var baslik = tablo.insertRow(tablo.rows.length);
            var baslikHucre1 = baslik.insertCell(0);
            var baslikHucre2 = baslik.insertCell(1);
            var baslikHucre3 = baslik.insertCell(2);
            var baslikHucre4 = baslik.insertCell(3);
            baslik.style = "height: 2.5rem;"
            baslikHucre1.innerHTML = "Parsel İl";
            baslikHucre2.innerHTML = "Parsel İlçe";
            baslikHucre3.innerHTML = "Parsel Mahalle";
            baslikHucre4.innerHTML = "";


            for (let i = 0; i < parcels.length; i++) {
                var yeniSatir = tablo.insertRow(tablo.rows.length);
                yeniSatir.style = "background-color: white;"
                yeniSatir.id = parcels[i].parcelId;

                var huc1 = yeniSatir.insertCell(0);
                var huc2 = yeniSatir.insertCell(1);
                var huc3 = yeniSatir.insertCell(2);
                var huc4 = yeniSatir.insertCell(3);

                huc1.innerHTML = parcels[i].parcelCity;
                huc2.innerHTML = parcels[i].parcelDistrict;
                huc3.innerHTML = parcels[i].parcelNeighbourhood;

                var duzenleButon = document.createElement("button");        // Tablo Edit butonu
                duzenleButon.innerHTML = '<i class="fa-regular fa-pen-to-square"></i> Edit';
                duzenleButon.style = "margin:0 1rem; text-align: center;"
                huc4.appendChild(duzenleButon);

                duzenleButon.onclick = function (event) {
                    var butonunOlduguSatir = event.target.closest("tr");
                    editingPopup(butonunOlduguSatir);
                };

                var silButon = document.createElement("button");            // Tablo Delete butonu
                silButon.style = "margin:0 1rem 0 0; text-align: center;"
                silButon.innerHTML = "<i class=\"fa-solid fa-xmark\" style=\"color: #000000;\"></i> Delete";
                huc4.appendChild(silButon);

                silButon.onclick = function (event) {
                    var butonunOlduguSatir = event.target.closest("tr");
                    deleteRow(butonunOlduguSatir);
                };

                var showButton = document.createElement("button");             // Tablo show button
                showButton.style = "margin:0 1rem 0 0; text-align: center;"
                showButton.innerHTML = "Haritada Göster";
                huc4.appendChild(showButton);

                showButton.onclick = function (event) {
                    var butonunOlduguSatir = event.target.closest("tr");
                    showFeature(butonunOlduguSatir.id)
                }
            }
        },
        error: function () {
            // Hata durumunda yapılacak işlemler
            alert("VERİTABANINDAN VERİLER OKUNAMADI")
        }
    });
}
tableRefresh();


// ÇİZİM BİTİNCE ÇALIŞAN FONKSİYON
function onDrawEnd(event) {
    const popup = document.getElementById("popup");
    const popupbackground = document.getElementById("popupBackground");
    popup.style.display = "block";
    popupbackground.style.display = "block";

    wktGeoms = format.writeGeometry(event.feature.getGeometry());    // Geometriyi al ve writeGeometry fonksiyonunun içine at
    // var transformedCoordinates = format.readGeometry(wkt).transform('EPSG:3857', 'EPSG:4326');
    console.log("WKT Geoms:", wktGeoms);
}

// PARSELİ KAYDET BUTONUNA BASINCA OLACAKLAR
saveParcelBtn.addEventListener("click", function () {
    var inputElements = document.getElementsByClassName("inputBox");

    var veri = {
        ParcelCity: inputElements[0].value,
        ParcelDistrict: inputElements[1].value,
        ParcelNeighbourhood: inputElements[2].value,
        wkt: wktGeoms
    }

    $.ajax({
        type: "POST",
        url: "https://localhost:44384/api/Parcel/add",
        data: JSON.stringify(veri),
        contentType: "application/json",
        success: function (response) {
            console.log("İstek başarıyla tamamlandı. Sunucu cevabı:", response);
            tableRefresh();
        },
        error: function (xhr, status, error) {
            console.error("Istek sirasinda bir hata olustu:", error);
            debugger;
        }
    });
    popup.style.display = 'none';
    popupBackground.style.display = "none";
});

// Çizim gösteren fonksiyon
function showFeature(satirId) {
    $.ajax({
        url: "https://localhost:44384/api/Parcel/getbyid?parcelId="+satirId,
        method: "GET",
        success: function (parcel){
            source.addFeature(format.readFeature(parcel.wkt))
        },
        error: function () {
            // Hata durumunda yapılacak işlemler
            alert("ÇİZİM GÖSTERİLEMİYOR");
        }
    });

}


// TABLODAN ELEMAN SİLEN FONKSİYON
function deleteRow(mevcutSatir) {
    var uyar = confirm("Bu satırı silmek istediğinize emin misiniz?");
    if (uyar) {
        mevcutSatir.parentNode.removeChild(mevcutSatir);
        
        var silinecekVeri = {
            "parcelId": parseInt(mevcutSatir.id) 
        }

        $.ajax({
            type: "DELETE",
            url: "https://localhost:44384/api/Parcel/delete",
            data: JSON.stringify(silinecekVeri),
            contentType: "application/json",
            success: function (response) {
                console.log("İstek başarıyla tamamlandı. Sunucu cevabı:", response);
                tableRefresh();
            },
            error: function (xhr, status, error) {
                console.error("İstek sırasında bir hata oluştu:", error);
            }
        });
    }
}

// TABLODA OLAN EDİT BUTONUNA TIKLAYINCA ÇALIŞAN
function editingPopup(mevcutSatir) {
    const editingPopup = document.getElementById("editingPopup");
    const editPopupBackground = document.getElementById("editPopupBackground");
    editingPopup.style.display = "block";
    editPopupBackground.style.display = "block";

    editWithPopup(mevcutSatir)
    const closeBtn = document.getElementById("editingClosePopupButton");
    closeBtn.onclick = editingPopupClose;
};

function editWithPopup(mevcutSatir) {
    var hucreler = mevcutSatir.getElementsByTagName('td');

    for (var i = 0; i < hucreler.length - 1; i++) {
        // edit popup'ında inputBox'ları dolduran döngü
        var editInputID = "editInput" + (i + 1);
        var inputBox = document.getElementById(editInputID);
        inputBox.value = hucreler[i].textContent;
    }
}

// EDİT POPUP KAPATMA BUTONU
function editingPopupClose() {
    const editingPopup = document.getElementById("editingPopup");
    editingPopup.style.display = "none";

    const editPopupBackground = document.getElementById("editPopupBackground");
    editPopupBackground.style.display = "none";
}

function veriiOkuBakim() {
    alert("Burayı düzenlemek lazım. Örnek bir veri çekme operasyonu");
    const denemeTxt = $.ajax({
        url: "https://localhost:44384/api/parcel/getall",
        method: "get",
        success: function (data) {
            console.log(data, "verisi okunduuu");
        },
        error: function () {
            console.log("okuyamadık hata oldu");
        }
    });

}

// EDİT POPUP ARKAPLANA TIKLAYINCA KAPATMA
const editPopupBackground = document.getElementById("editPopupBackground");
editPopupBackground.onclick = function () {
    const editingPopup = document.getElementById("editingPopup");
    editingPopup.style.display = 'none';
    editPopupBackground.style.display = "none";
}

// POPUP ARKAPLANA TIKLAYINCA KAPATMA
const popupBackground = document.getElementById("popupBackground");
popupBackground.onclick = function () {
    popup.style.display = 'none';
    popupBackground.style.display = "none";
    var cizimler = source.getFeatures();
    source.removeFeature(cizimler[cizimler.length - 1]);
}

// POPUP KAPATMA BUTONU
const closePopupButton = document.getElementById('closePopupButton');
closePopupButton.addEventListener('click', () => {

    popup.style.display = 'none';
    const popupBackground = document.getElementById("popupBackground");
    popupBackground.style.display = "none";

    var cizimler = source.getFeatures();
    source.removeFeature(cizimler[cizimler.length - 1]);
});

// ZOOM BUTON KONTROLLERI
document.getElementById("zoom-out").addEventListener("click", function () {
    const view = map.getView();
    const zoom = view.getZoom();
    view.setZoom(zoom - 1);
});
document.getElementById("zoom-in").addEventListener("click", function () {
    const view = map.getView();
    const zoom = view.getZoom();
    view.setZoom(zoom + 1);
});



// ANA EKRANDA DURAN BÜYÜK EDİT BUTONU
mainEditBtn.addEventListener("click", veriiOkuBakim);

// Handle change event.
typeSelect.onchange = function () {
    map.removeInteraction(draw);
    map.removeInteraction(snap);
    addInteractions();
};

addInteractions();

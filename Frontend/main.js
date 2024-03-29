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
const updateBtn = document.getElementById("updateBtn");
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
        zoom: 3,                                        // Harita ilk açıldığında zoom miktarı
        extent,
    }),
});

/* debugger
const modify = new Modify({ source: source });
map.addInteraction(modify); */

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
            $("#table").empty();

            var baslik = tablo.insertRow(tablo.rows.length);
            var baslikHucre1 = baslik.insertCell(0);
            var baslikHucre2 = baslik.insertCell(1);
            var baslikHucre3 = baslik.insertCell(2);
            var baslikHucre4 = baslik.insertCell(3);
            baslik.style = "height: 2.5rem;"
            baslikHucre1.style = "width: 16.66%;";
            baslikHucre2.style = "width: 16.66%;";
            baslikHucre3.style = "width: 16.66%;";
            baslikHucre4.style = "width: 50%;";
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
                source.addFeature(format.readFeature(parcels[i].wkt));
                source.getFeatures()[source.getFeatures().length - 1].set("uniqueID", parcels[i].parcelId);

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
            }
        },
        error: function () {
            // Hata durumunda yapılacak işlemler
            alert("VERİTABANINDAN VERİLER OKUNAMADI. BACKEND'IN ÇALIŞIP ÇALIŞMADIĞINI KONTROL ET!")
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
            inputElements[0].value = "";
            inputElements[1].value = "";
            inputElements[2].value = "";
            tableRefresh();
        },
        error: function (xhr, status, error) {
            console.error("Istek sirasinda bir hata olustu:", error);
        }
    });
    popup.style.display = 'none';
    popupBackground.style.display = "none";
});


// TABLODAN ELEMAN SİLEN FONKSİYON
function deleteRow(mevcutSatir) {
    var uyar = confirm("Bu satırı silmek istediğinize emin misiniz?");
    if (uyar) {
        mevcutSatir.parentNode.removeChild(mevcutSatir);

        var silinecekVeri = {
            "parcelId": parseInt(mevcutSatir.id)
        }
        featureRemover(mevcutSatir);
        source.removeFeature()
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

// HARİTADAKİ ÇİZİMLERİ SİLEN FONKSİYON
function featureRemover(mevcutSatir) {
    let id = mevcutSatir.id
    $.ajax({
        url: "https://localhost:44384/api/Parcel/getbyid?parcelId=" + id,
        method: "GET",

        success: function (parcel) {
            var cizimler = source.getFeatures();
            for (var i = 0; i < cizimler.length; i++) {
                if (cizimler[i].uniqueID == parcel.id) {
                    source.removeFeature(cizimler[i]);
                }
            }
        },
        error: function () {
            alert("ÇİZİM GÖSTERİLEMİYOR");
        }
    });
}

// TABLODA OLAN EDİT BUTONUNA TIKLAYINCA ÇALIŞAN
function editingPopup(mevcutSatir) {
    const editingPopup = document.getElementById("editingPopup");
    const editPopupBackground = document.getElementById("editPopupBackground");
    editingPopup.style.display = "block";
    editPopupBackground.style.display = "block";

    const closeBtn = document.getElementById("editingClosePopupButton");
    closeBtn.onclick = editingPopupClose;
    var hucreler = mevcutSatir.getElementsByTagName('td');

    for (var i = 0; i < hucreler.length - 1; i++) {
        // edit popup'ında inputBox'ları dolduran döngü
        var editInputID = "editInput" + (i + 1);
        var inputBox = document.getElementById(editInputID);
        inputBox.value = hucreler[i].textContent;
    }

    cancelBtn.onclick = function () {
        const editingPopup = document.getElementById("editingPopup");
        editingPopup.style.display = "none";

        const editPopupBackground = document.getElementById("editPopupBackground");
        editPopupBackground.style.display = "none";
    }

    updateBtn.onclick = function () {
        console.log("update buton tıklama olayı gerçekleşti");
        let id = parseInt(mevcutSatir.id);
        var inputBox = document.getElementsByClassName("editInputBox");
        var cizimler = source.getFeatures();
        var selectedFeature;
        for (var i = 0; i < cizimler.length; i++) {
            if (cizimler[i].values_.uniqueID == id) {
                selectedFeature = cizimler[i];
                break
            }
        }
        $.ajax({
            type: "POST",
            url: "https://localhost:44384/api/Parcel/update",
            data: JSON.stringify({
                parcelId: id,
                parcelCity: inputBox[0].value,
                parcelDistrict: inputBox[1].value,
                parcelNeighbourhood: inputBox[2].value,
                wkt: format.writeGeometry(selectedFeature.getGeometry())
            }),
            contentType: "application/json",
            success: function (response) {
                tableRefresh();
                const editingPopup = document.getElementById("editingPopup");
                editingPopup.style.display = "none";

                const editPopupBackground = document.getElementById("editPopupBackground");
                editPopupBackground.style.display = "none";
            },
            error: function (xhr, status, error) {
                console.error("Istek sirasinda bir hata olustu:", error);
            }
        });
    }
};


// EDİT POPUP KAPATMA BUTONU
function editingPopupClose() {
    const editingPopup = document.getElementById("editingPopup");
    editingPopup.style.display = "none";

    const editPopupBackground = document.getElementById("editPopupBackground");
    editPopupBackground.style.display = "none";
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

    var inputElements = document.getElementsByClassName("inputBox");
    inputElements[0].value = "";
    inputElements[1].value = "";
    inputElements[2].value = "";

    var cizimler = source.getFeatures();
    var lastIndex = cizimler.length;

    for (var i = 0; i < lastIndex; i++) {
        if (cizimler[i].uniqueID == undefined) {
            source.removeFeature(cizimler[i]);
        }
    }

    tableRefresh();
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
var isOn = false;
mainEditBtn.textContent = "Mod: Çizim Modu";
mainEditBtn.addEventListener("click", function () {
    isOn = !isOn;
    const modify = new Modify({ source: source });
    if (isOn) {
        mainEditBtn.textContent = "Mod: Düzenleme Modu";
        // Açık olduğunda olması gerekenler
        map.removeInteraction(draw);
        map.addInteraction(modify);

        // Tıklama olayını izle
        map.on('click', function (event) {
            var clickedFeatures = map.getFeaturesAtPixel(event.pixel, {
                hitTolerance: 10
            });
            var selectedFeature
            
            if (clickedFeatures) {
                for(var i = 0 ; i< clickedFeatures.length ; i++){
                    if (clickedFeatures[i].values_.uniqueID != undefined){
                        selectedFeature = clickedFeatures[i];
                        console.log(selectedFeature.values_.uniqueID);
                        break
                    }
                };
            }
        });
    }
    else {
        mainEditBtn.textContent = "Mod: Çizim Modu";
        // Kapalı olduğunda olması gerekenler
        map.removeInteraction(modify);
        map.addInteraction(draw);
    }



});

// Handle change event.
typeSelect.onchange = function () {
    map.removeInteraction(draw);
    map.removeInteraction(snap);
    addInteractions();
};

addInteractions();

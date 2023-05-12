ymaps.ready(init);

series = [];
pending_series = [];

function insert_points(p, add_to_pending) {
    if (series.length == 0) {
//        console.debug("push initial points at #" + series.length );
        series = p.slice(0);

        return true;
    }

    var joined = false;

    var s = series;
    if (p[0][0] == s[s.length - 1][0] &&
        p[0][1] == s[s.length - 1][1]) {
//        console.debug("join new polyline after series");

        s = s.concat(p.slice(1));
        series = s;

        joined = true;
    } else {
        if (p[p.length - 1][0] == s[0][0] &&
            p[p.length - 1][1] == s[0][1]) {
//            console.debug("join new polyline before series");

            s = p.concat(s.slice(1));
            series = s;

            joined = true;
        }
    }

    if (!joined && add_to_pending) {
//        console.debug("push new points to pending at #" + pending_series.length);
        pending_series.push(p.slice(0));
    }

    if (joined) {
        for(var i = 0; i < pending_series.length;) {

            if (insert_points(pending_series[i], false)) {
//                console.debug("try penging series #" + i + " ... ok");
                pending_series.splice(i, i + 1);
            } else {
//                console.debug("try penging series #" + i + " ... no luck");
                i++;
            }
        }
    }

    return joined;
}

function updateDistance() {
    var d = 0;
    var start = myStart.properties.get('seriesIndex');
    var end = myEnd.properties.get('seriesIndex');
    for(var i = start + 1; i <= end; i++) {
        d += ymaps.coordSystem.geo.getDistance(series[i - 1], series[i]);
    }

    myEnd.properties.set('iconContent', "Антистапель, " + Math.round(d) + " м");

//    console.debug("dragend, distance " + d);
}

function on_dragend(p, e) {
    var g = p.geometry.getCoordinates();

    var n = -1;
    var min = 360;

    for(var i = 0; i < series.length; i++) {
        var d = Math.abs(g[0] - series[i][0]) + Math.abs(g[1] - series[i][1]);
        if (d < min) {
            min = d;
            n = i;
        }
    }

    p.geometry.setCoordinates(series[n]);
    p.properties.set('seriesIndex', n);

    updateDistance();
}


function init() {
    jQuery.get("kirzhach.xml", function(k) {
        var ways = k.getElementsByTagName("way");

        var sw = [90, 180];
        var ne = [-90, -180];

        for(var wn = 0; wn < ways.length; wn++) {
            var points = [];

            var nds = ways[wn].getElementsByTagName("nd");
            for(var ndn = 0; ndn < nds.length; ndn++) {
                var ref = nds[ndn].getAttribute("ref");
                var node = k.getElementById(ref);
                var p = [
                    parseFloat(node.getAttribute("lat")),
                    parseFloat(node.getAttribute("lon")),
                ];

                sw[0] = Math.min(sw[0], p[0]);
                sw[1] = Math.min(sw[1], p[1]);
                ne[0] = Math.max(ne[0], p[0]);
                ne[1] = Math.max(ne[1], p[1]);

                points.push(p);
            }

            insert_points(points, true);
        }

        var margin = [ (ne[0] - sw[0]) / 5, (ne[1] - sw[1]) / 5 ];
        sw[0] -= margin[0];
        sw[1] -= margin[1];

        ne[0] += margin[0];
        ne[1] += margin[1];

        // Создаем ломаную с помощью вспомогательного класса Polyline.
        var myPolyline = new ymaps.Polyline(
                series, // Указываем координаты вершин ломаной.
            {
                // Описываем свойства геообъекта.
                hintContent: "Киржач"    // Содержимое балуна.
            }, {
                // Задаем опции геообъекта.
                balloonCloseButton: false,  // Отключаем кнопку закрытия балуна.
                strokeColor: "#0000A0",     // Цвет линии.
                strokeWidth: 2,             // Ширина линии.
                strokeOpacity: 0.5,         // Коэффициент прозрачности.
                draggable: false,           // Выключаем возможность перетаскивания ломаной.
            });

        myStart = new ymaps.GeoObject({
            // Описание геометрии.
            geometry: {
                type: "Point",
                coordinates: series[409],
            },
            // Свойства.
            properties: {
                // Контент метки.
                iconContent: 'Стапель',
                hintContent: 'Ну давай уже тащи',
                seriesIndex: 409, // индекс узла ломаной
            }
        }, {
            // Опции.
            // Иконка метки будет растягиваться под размер ее содержимого.
            preset: 'islands#blackStretchyIcon',
            draggable: true,    // Метку можно перемещать.
        });

        myEnd = new ymaps.GeoObject({
            // Описание геометрии.
            geometry: {
                type: "Point",
                coordinates: series[1667],
            },
            // Свойства.
            properties: {
                // Контент метки.
                iconContent: 'Антистапель',
                hintContent: 'Ну давай уже тащи',
                seriesIndex: 1667, // индекс узла ломаной
            }
        }, {
            // Опции.
            // Иконка метки будет растягиваться под размер ее содержимого.
            preset: 'islands#blackStretchyIcon',
            draggable: true,    // Метку можно перемещать.
        });

        myStart.events.add('dragend', function(e) { on_dragend(myStart, e); });
        myEnd.events.add('dragend', function(e) { on_dragend(myEnd, e); });

        // Создаем карту.
        var myMap = new ymaps.Map("map", {
//                center: [55.72, 37.44],
//                zoom: 10,
                bounds: [ sw, ne ],
            }, {
                searchControlProvider: 'yandex#search'
            });

        // Добавляем линии на карту.
        myMap.geoObjects
            .add(myPolyline)
            .add(myStart)
            .add(myEnd);

        updateDistance();
    });
}


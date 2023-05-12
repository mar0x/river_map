ymaps.ready(init);

total_ways = {};

function update_min(min, p) {
    min[0] = Math.min(min[0], p[0]);
    min[1] = Math.min(min[1], p[1]);
}

function update_max(max, p) {
    max[0] = Math.max(max[0], p[0]);
    max[1] = Math.max(max[1], p[1]);
}

function fake_distance(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function WayPoint(way, point_id) {
    var wp = this;

    if (typeof(way) == "object" && typeof(point_id) == "number") {
        wp.way = way;
        wp.point_id = point_id;
        wp.point = wp.way.points[wp.point_id];
    } else {
        wp.way = null;
        wp.point_id = 0;
        wp.point = null;
    }
}

WayPoint.prototype = {
    next: function() {
        var wp = this;
        var i = wp.point_id + 1;;
        if (i >= wp.way.points.length) {
            if (wp.way.hasOwnProperty("next")) {
                return wp.way.next;
            } else {
                return null;
            }
        }

        return new WayPoint(wp.way, i);
    },

    is: function(b) {
        var wp = this;
        return wp.way == b.way && wp.point_id == b.point_id;
    },
}

function Way(doc, w_node) {
    var w = this;

    w.id = w_node.getAttribute("id");
    w.name = w.id;
    w.points = [];
    w.dist = [];
    w.refs = {};

    w.sw = [90, 180];
    w.ne = [-90, -180];
    w.bounds = [ w.sw, w.ne ];

    w.next = null;
    w.prev = [];

    var nds = w_node.getElementsByTagName("nd");
    var ref_id = 0;
    for(var ndn = 0; ndn < nds.length; ndn++) {
        ref_id = nds[ndn].getAttribute("ref");
        if (!ref_id) continue;

        var ref_node = doc.getElementById(ref_id);
        if (!ref_node) continue;

        var p = [
            parseFloat(ref_node.getAttribute("lat")),
            parseFloat(ref_node.getAttribute("lon")),
        ];

        update_min(w.sw, p);
        update_max(w.ne, p);

        w.refs[ref_id] = w.points.length;
        w.points.push(p);
        w.dist.push(NaN);
    }
    w.last_ref = ref_id;

    var tags = w_node.getElementsByTagName("tag");
    for(var tagn = 0; tagn < tags.length; tagn++) {
        var tag_node = tags[tagn];
        var k = tag_node.getAttribute("k");
        if (!k || k != "name") continue;

        var v = tag_node.getAttribute("v");
        w.name = v;

        break;
    }
}

Way.prototype = {
    area_contains: function(p) {
        var w = this;

        return p[0] >= w.sw[0] && p[0] <= w.ne[0] &&
            p[1] >= w.sw[1] && p[1] <= w.ne[1];
    },

    find: function(p) {
        var w = this;

        if (typeof(p) == "string") {
            if (w.refs.hasOwnProperty(p)) {
                return new WayPoint(w, w.refs[p]);
            }

            return null;
        }

        if (typeof(p) == "object") {
            if (!w.area_contains(p)) return null;

            if (w.points[0][0] == p[0] && w.points[0][1] == p[1]) {
                return new WayPoint(w, 0);
            }
        }

        return null;
    },

    distance_to_area: function(p) {
        var w = this;

        if (p[0] < w.sw[0] && p[1] < w.sw[1]) return fake_distance(p, w.sw);

        if (p[0] < w.sw[0] && p[1] > w.ne[1]) return fake_distance(p, [ w.sw[0], w.ne[1] ]);

        if (p[0] > w.ne[0] && p[1] > w.ne[1]) return fake_distance(p, w.ne);

        if (p[0] > w.ne[0] && p[1] < w.sw[1]) return fake_distance(p, [ w.ne[0], w.sw[1] ]);

        if (p[0] < w.sw[0]) return fake_distance(p, [ w.sw[0], p[1] ]);

        if (p[0] > w.ne[0]) return fake_distance(p, [ w.ne[0], p[1] ]);

        if (p[1] < w.sw[1]) return fake_distance(p, [ p[0], w.sw[1] ]);

        if (p[1] > w.ne[1]) return fake_distance(p, [ p[0], w.ne[1] ]);

        return 0;
    },

    nearest: function(p, res) {
        var w = this;

        if (typeof(res) != "object") {
            res = new WayPoint();
        }

        if (!res.hasOwnProperty("distance")) {
            res.distance = 360;
        }

        for(var i = 0; i < w.points.length; i++) {
            var d = fake_distance(w.points[i], p);
            if (d < res.distance) {
                res.distance = d;
                res.point_id = i;
                res.point = w.points[i];
                res.way = w;
            }
        }

        return res;
    },

}


function join_ways() {

    for(var i in total_ways) {
        var w = total_ways[i];

        for(var wn in total_ways) {
            if (wn == i) continue;
            var ww = total_ways[wn];

            w.next = ww.find(w.last_ref);
            if (w.next) {
                w.next.way.prev.push( new WayPoint(w, w.points.length - 1) );
//                console.debug("way[" + i + "] (" + w.name + ") connected to " +
//                    "way[" + wn + "][" + w.next.point_id + "] (" + ww.name + ") via node " + w.last_ref);

                break;
            }
        }

        if (w.next) {
            continue;
        }

//        console.debug("way[" + i + "] (" + w.name + ") is not connected using ref " + w.last_ref);

        var last_point = w.points[w.points.length - 1];
        for(var wn in total_ways) {
            if (wn == i) continue;
            var ww = total_ways[wn];

            w.next = ww.find(last_point);
            if (w.next) {
                w.next.way.prev.push( new WayPoint(w, w.points.length - 1) );
//                console.debug("way[" + i + "] (" + w.name + ") connected to " +
//                    "way[" + wn + "][" + w.next.point_id + "] (" + ww.name + ") via last point");

                break;
            }
        }

        if (w.next) {
            continue;
        }

//        console.debug("way[" + i + "] (" + w.name + ") is not connected using last point, giving up");
    }

}

function find_nearest(p) {
    var d = [];

    for(var i in total_ways) {
        var w = total_ways[i];

        d.push( { "w": w, "d": w.distance_to_area(p) } );
    }

    d.sort( function (a, b) { return a.d - b.d; } );

    var res = new WayPoint();
    res.distance = 360;

    for(var i = 0; i < d.length; i++) {
        var w = d[i].w;
        var r = w.nearest(p, res);

        if (r.way != w) break;
    }

    return res;
}

function add_river(river, w, d) {
    if (river.length == 0) {
        river.push( { name: w.name, dist: d } );
        return;
    }

    var r = river[river.length - 1];
    if (r.name == w.name) {
        r.dist += d;
    } else {
        river.push( { name: w.name, dist: d } );
    }
}

function update_distance() {
    var res = 0;
    var start = myStart.properties.get('nearest');
    var end = myEnd.properties.get('nearest');
    var rivers = [];
    var route = [];

    var i = start;
    var n = i;
    var d;
    while (!i.is(end)) {
        route.push( i.point );
        n = i.next();
        if (!n) {
            break;
        }

        d = i.way.dist[i.point_id];
        if (isNaN(d)) {
            d = ymaps.coordSystem.geo.getDistance(i.point, n.point);
            i.way.dist[i.point_id] = d;
        }

        add_river(rivers, n.way, d);

        res += d;
        i = n;
    }

    var b = "";

    for(var i = 0; i < rivers.length; i++) {
        var r = rivers[i];
        if (Math.round(r.dist) <= 0) continue;

        if (b.length > 0) {
            b += "<br/>";
        }
        b += "<b>" + r.name + '</b> <span style="float: right">' + Math.round(r.dist) + " м</span>";
    }
    b += "<hr/>";
    if (rivers.length > 1) {
        b += '<b>По воде</b> <span style="float: right">' + Math.round(res) + " м</span><br/>";
    }

    d = ymaps.coordSystem.geo.getDistance(start.point, end.point);
    b += '<b>Напрямик</b> <span style="float: right">' + Math.round(d) + " м</span><br/>";

    myMap.balloon.open(
        myMap.getCenter(),
        { contentHeader: "План сплава", contentBody: b, }
    );

    myRoute.geometry.setCoordinates( route );
}

function on_route_click(e) {
    var coords = e.get('coords');
    var d = find_nearest(coords);

    if (myMap.balloon.isOpen()) {
        myMap.balloon.close();
    }

    myMap.balloon.open(
        d.point,
        { contentHeader: "Кто здесь?", }
    );

}

function on_dragend(p, e) {
    var g = p.geometry.getCoordinates();
    var d = find_nearest(g);

    p.geometry.setCoordinates(d.point);
    p.properties.set('nearest', d);

    update_distance();
}


function init() {
    jQuery.get(xml_name, function(doc) {
        var ways = doc.getElementsByTagName("way");

        var sw = [90, 180];
        var ne = [-90, -180];

        for(var wn = 0; wn < ways.length; wn++) {
            var w = new Way(doc, ways[wn]);

            total_ways[w.id] = w;
        }

        join_ways();

        for (var i in total_ways) {
            var w = total_ways[i];

            w.polyline = new ymaps.Polyline(
                    w.points,
                {
                    hintContent: w.name
                }, {
                    balloonCloseButton: false,  // Отключаем кнопку закрытия балуна.
                    strokeColor: "#0000A0",     // Цвет линии.
                    strokeWidth: 2,             // Ширина линии.
                    strokeOpacity: 0.2,         // Коэффициент прозрачности.
                    draggable: false,           // Выключаем возможность перетаскивания ломаной.
                });
        }

        var start_at = find_nearest(start_coord);
        myStart = new ymaps.GeoObject({
            geometry: {
                type: "Point",
                coordinates: start_at.point,
            },
            properties: {
                iconContent: 'Стапель',
                // hintContent: 'Ну давай уже тащи',
                nearest: start_at,
            }
        }, {
            preset: 'islands#blackStretchyIcon',
            draggable: true,    // Метку можно перемещать.
        });

        var end_at = find_nearest(end_coord);
        myEnd = new ymaps.GeoObject({
            geometry: {
                type: "Point",
                coordinates: end_at.point,
            },
            properties: {
                iconContent: 'Антистапель',
                // hintContent: 'Ну давай уже тащи',
                nearest: end_at,
            }
        }, {
            preset: 'islands#blackStretchyIcon',
            draggable: true,    // Метку можно перемещать.
        });

        myRoute = new ymaps.Polyline(
                [ start_at.point ],
            {
//                hintContent: "Сплав"
            }, {
                balloonCloseButton: false,  // Отключаем кнопку закрытия балуна.
                strokeColor: "#A00080",     // Цвет линии.
                strokeWidth: 3,             // Ширина линии.
                strokeOpacity: 0.5,         // Коэффициент прозрачности.
                draggable: false,           // Выключаем возможность перетаскивания ломаной.
            });

        update_min(sw, start_at.point);
        update_max(ne, start_at.point);

        update_min(sw, end_at.point);
        update_max(ne, end_at.point);

        myStart.events.add('dragend', function(e) { on_dragend(myStart, e); });
        myEnd.events.add('dragend', function(e) { on_dragend(myEnd, e); });

        myMap = new ymaps.Map("map", {
//                center: [55.72, 37.44],
//                zoom: 10,
                bounds: [ sw, ne ],
            }, {
                searchControlProvider: 'yandex#search'
            });

        myMap.geoObjects
            .add(myStart)
            .add(myEnd)
            .add(myRoute)

        for (var i in total_ways) {
            var w = total_ways[i];
            myMap.geoObjects.add(w.polyline);
        }

        myMap.events.add('contextmenu', function (e) { on_route_click(e); });

        update_distance();
    });
}


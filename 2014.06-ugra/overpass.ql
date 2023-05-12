// curl -v --data-urlencode data@overpass.ql -X POST 'https://overpass-api.de/api/interpreter' -o data.xml
// curl -v --data-urlencode data@overpass.ql -X POST 'https://overpass.kumi.systems/api/interpreter' -o data.xml

(
  way
    ["waterway"="river"]
    [ "name" = "Ресса"]
    (53.0000,33.0000,56.0000,38.0000);
  >;
  way
    ["waterway"="river"]
    [ "name" = "Угра"]
    (53.0000,33.0000,56.0000,38.0000);
  >;
);
out;

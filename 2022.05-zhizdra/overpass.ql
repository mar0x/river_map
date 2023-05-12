// http://overpass-api.de/api/interpreter
// curl -v -X POST --data-urlencode 'data@overpass.ql' http://overpass-api.de/api/interpreter -o data.xml

(
  way
    ["waterway"="river"]
    [ "name" = "Жиздра"]
    (53.0000,34.925373,54.000,35.389202);
  >;
);
out;

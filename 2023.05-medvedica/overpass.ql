// http://overpass-api.de/api/interpreter
// curl -v -X POST --data-urlencode 'data@overpass.ql' http://overpass-api.de/api/interpreter -o data.xml

(
  way
    ["waterway"="river"]
    [ "name" = "Медведица"]
    (56.0000,34.0,58.000,38.0);
  >;
);
out;

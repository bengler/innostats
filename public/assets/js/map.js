window.mapChart = function () {

  var selectedMunicipality = null;

  d3.select("#map-container .title").append("a")
    .attr("href", "javascript:window.mapChart.resetMapFilter()")
    .attr("class", "reset")
    .text("reset")
    .style("display", "none");

  var brewerScheme = "RdYlGn"

  var map = null, g = null;

  return {
      init: function() {
        map = new L.Map("map", {
            center: new L.LatLng(65.5,18.283643),
            zoom: 4,
            zoomAnimation: false,
            scrollWheelZoom: false,
            minZoom: 3,
            zoomControl: false
        });

        var zoomControl = new L.Control.Zoom({position: 'topright'});
        map.addControl(zoomControl);

        var url = "http://a.tiles.mapbox.com/v3/evenwestvang.map-y297i3xr.jsonp";
        wax.tilejson(url, function(tilejson) {
          map.addLayer(new wax.leaf.connector(tilejson));
        });

        svg = d3.select(map.getPanes().overlayPane).append("svg");
        g = svg.append("g")
                .attr("class", brewerScheme);

      },
      load: function() {
        var that = this;
        d3.json("sanitized_data/municipalities_no_oceans.json", function(json) {

          function project(x) {
            var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
            return [point.x, point.y];
          }

          // Reposition the SVG to cover the features.
          function reset() {
            var bottomLeft = project(bounds[0]),
                topRight = project(bounds[1]);

            svg.attr("width", topRight[0] - bottomLeft[0])
                .attr("height", bottomLeft[1] - topRight[1])
                .style("margin-left", bottomLeft[0] + "px")
                .style("margin-top", topRight[1] + "px");

            g.attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");
            feature.attr("d", path);
          }

          var bounds = d3.geo.bounds(json),
              bottomLeft = project(bounds[0]),
              topRight = project(bounds[1]);

          var path = d3.geo.path().projection(project);

          var feature = g.selectAll("path")
              .data(json.features)
              .enter().append("path")
              .attr("d", path)
              .style("class", "white")
              .attr("id", function(d) { return "m" + (+d.properties.KOMM); })
            .on("click", function(d,i) {
              that.toggleFilter(d,i, this);
            })
            .on("mouseover", function(d,i) {
              d3.select(this).style("stroke-width", "1.2");
              d3.event.x;
            })
            .on("mouseout", function(d,i) {
              d3.select(this).style("stroke-width", "0.2"); });
            // .append("svg:title")
            //   .text(function(d) { return d.properties.NAVN; });

          window.mapFeatures = feature;

          map.on("viewreset", reset);
          reset();

          mapLoaded.resolve();
        });
      },
      renderMap: function() {
        var municipalityList = window.municipalities.all();
        var maxGrants = window.municipalities.top(1)[0].value;

        var i = 0,
          n = municipalityList.length,
          d = 0,
          path = 0,
          colorClass = 0,
          val = 0;

        while (++i < n) {
          d = municipalityList[i];
          path = d3.select("#m" + d.key);
          if (d.value == 0) {
            colorClass = "black"
          } else {
            val = Math.min(9,~~(9 - (d.value * 9 / maxGrants)));
            colorClass = "q" + val + "-9";
          }
          path.attr("class", colorClass);
        }
      },

      toggleFilter: function(d, i, el) {
        if (selectedMunicipality == d) {
          this.resetMapFilter();
        } else {
          this.filterByMunicipality(d, i, el);
        }
      },

      filterByMunicipalityID: function(id) {
        el = d3.select("#map #m" + id);
        this.filterByMunicipality(el.datum(), 0, el[0][0]);
      },

      filterByMunicipality: function(d, i, el) {
        selectedMunicipality = d;
        d3.select("#map-container .title #filtered-municipality")[0][0].innerHTML = "(" + d.properties.NAVN + ")";
        g.attr("class", "Greys");
        d3.selectAll("#map path").style("fill", null);
        d3.select(el).style("fill", "#c44");
        d3.select("#map-container .title a").style("display", null);
        window.municipality.filterExact(d.properties.KOMM);
        window.renderAll();
      },

      resetMapFilter: function() {
        selectedMunicipality = null;
        g.attr("class", brewerScheme);
        d3.select("#map-container .title a").style("display", "none");
        d3.select("#map-container .title #filtered-municipality")[0][0].innerHTML = "";
        d3.selectAll("#map path").style("fill", null);
        window.municipality.filterAll();
        window.renderAll();
      }
  };
}();

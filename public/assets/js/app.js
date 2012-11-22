(function() {

if (!Modernizr.svg) {
  $("header, footer").hide();
  $(".svg_missing_warning").show();
  return
}

window.grantsLoaded = jQuery.Deferred();
window.mapLoaded = jQuery.Deferred();

d3.json("sanitized_data/NaceRev2DescAndHierarchyPruned.json", function(json) {
  window.naceHierarchy = json.naceHierarchy;
  window.naceDescriptions = json.naceDescriptions;
  $.when(grantsLoaded).then(function() { icicle.init(); });
});

function toggle() {
  $(".example_list").toggle(); 
  $(".example_link").toggleClass("enabled"); 
}

$(".example_link").click(function() { 
  toggle();
});

$(".example1").click(function() {
  resetAll();
  icicle.selectByCode("J");
  toggle();
});

$(".example2").click(function() {
  resetAll();
  charts[1].filter([new Date(2010, 0, 1), new Date(2011, 12, 21)]);
  icicle.selectByCode("03.2");
  toggle();
});

$(".example3").click(function() {
  resetAll();
  icicle.selectByCode("58.13");
  mapChart.filterByMunicipalityID(1902);
  toggle();
});

$(".example4").click(function() {
  resetAll();
  icicle.selectByCode("16.21");
  charts[0].filter([1000, 60000]);
  mapChart.filterByMunicipalityID(426);
  toggle();
});

$(".example5").click(function() {
  toggle();
  resetAll();
  renderAll();
});

$("input[name=filter_text]").keyup(function() {
  var input = ($("input[name=filter_text]").val());
  if (input !== "") {
    $(".tell-me-more .reset").show();
  } else {
    $(".tell-me-more .reset").hide();
  }
  var expression = ""
  for(var i = 0; i < input.length; i++ ) { 
    expression += input.charAt(i) + "+.?" 
  }
  re = new RegExp(expression, "i");
  clientNameFilter.filter(function(val, i) { 
    return re.test(val) 
  } ); 
  renderAll();
});

$(".tell-me-more .reset").click(function() {
  $("input[name=filter_text]").val("")
  $(".tell-me-more .reset").hide();
  clientNameFilter.filterAll();
  renderAll();
});

$.when(grantsLoaded, mapLoaded).then(function() { renderAll(); });

var funds = function() {

  // Progress meter
  var width = 960,
      height = 500,
      twoPi = 2 * Math.PI,
      progress = 0,
      total = 953000,
      formatPercent = d3.format(".0%");

  var arc = d3.svg.arc()
      .startAngle(0)
      .innerRadius(60)
      .outerRadius(90);

  var svg = d3.select("body").append("svg")
      .attr("class", "progress-meter-svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  var meter = svg.append("g")
      .attr("class", "progress-meter");

  meter.append("path")
      .attr("class", "background")
      .attr("d", arc.endAngle(twoPi));

  var foreground = meter.append("path")
      .attr("class", "foreground");

  var text = meter.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em");

  var chartWidth = 330;

  // Load funds
  d3.csv("sanitized_data/funds.csv")
    .on("progress", function() {
      var i = d3.interpolate(progress, d3.event.loaded / total);
      d3.transition().tween("progress", function() {
        return function(t) {
          progress = i(t);
          foreground.attr("d", arc.endAngle(twoPi * progress));
          text.text(formatPercent(progress));
        };
      });
    })
  .get(function(error, grants) {
    meter.transition().delay(250).attr("transform", "scale(0)");

    mapChart.init();
    mapChart.load();

    // Various formatters
    var formatNumber = d3.format(",d"),
        formatChange = d3.format("+,d"),
        formatDate = d3.time.format("%B %d, %Y"),
        formatTime = d3.time.format("%I:%M %p");

    var formatDateInput = d3.time.format("%x");

    // Add non-conformant codes to EU NACE class
    grants.forEach(function(d, i) {
      d.grant = +d.grant;
      d.date = formatDateInput.parse(d.date);
      d.isLoan = d.grantKind !== "Tilskudd";
      d.muniNr = +d.municipalityNr;
      d.naceDesc = naceDescriptions[d.nace];
      d.index = i;
    });

    // Create the crossfilter for the relevant dimensions and groups.
    var grant = crossfilter(grants),
      all = grant.groupAll(),
      clientName = grant.dimension(function(d) { return d.client; }),
      municipality = grant.dimension(function(d) { return d.muniNr; }),
      municipalities = municipality.group(),
      grantSum = grant.dimension(function(d) { return Math.min(1000000000, d.grant); }),
      grantSums = grantSum.group(function(d) { return Math.floor(d / 5000) * 5000; }),
      date = grant.dimension(function(d) { return d3.time.month(d.date); }),
      dates = date.group(),
      grantKind = grant.dimension(function(d) { return +d.isLoan; }),
      grantKinds = grantKind.group(),
      naceCodeSum = grant.dimension(function(d) { return d.nace; }),
      naceCodeSums = naceCodeSum.group().reduce(
        function reduceAdd(p, v) {
          p.value += 1;
          p.grants += v.grant;
          return p;
        },
        function reduceRemove(p, v) {
          p.value -= 1;
          p.grants -= v.grant;
          return p;
        },
        function reduceInitial() {
          return {value: 0, grants:0};
        }
      ).order(
        function orderValue(p) {
          return p.value;
        }
      );

      sumTotal = grant.groupAll().reduce(
        function reduceAdd(p, v) {
          if (v.isLoan) {
            p.loans += v.grant;
          } else {
            p.grants += v.grant;
          }
          return p;
        },
        function reduceRemove(p, v) {
          if (v.isLoan) {
            p.loans -= v.grant;
          } else {
            p.grants -= v.grant;
          }
          return p;
        },
        function reduceInitial() {
          return {loans: 0, grants:0};
        }
      );

    window.resetAll = function() {
      $("input[name=filter_text]").val("")
      charts[0].filter(null);
      charts[1].filter(null);
      icicle.resetIcicle();
      mapChart.resetMapFilter();
    };

    var naceCodeKeys = {},
      allCodes = naceCodeSums.all(),
      n = allCodes.length,
      i = 0;

    while (++i < n) {
      naceCodeKeys[allCodes[i].key] = allCodes[i];
    }

    // Punch a small global hole
    window.municipalities = municipalities;
    window.municipality = municipality;
    window.naceCodeKeys = naceCodeKeys;
    window.naceCodeSum = naceCodeSum;
    window.naceCodeSums = naceCodeSums;
    window.clientNameFilter = clientName;
    window.all = all;

    // for now show only grants
    window.grantKind = grantKind;
    grantKind.filter(false);

    d3.select('#grantSelector').on("click", function(d,i) {
      d3.select('#grantSelector').classed("selected", true);
      d3.select('#loanSelector').classed("selected", false);
      grantKind.filter(false);
      renderAll();
    });

    d3.select('#loanSelector').on("click", function(d,i) {
      d3.select('#grantSelector').classed("selected", false);
      d3.select('#loanSelector').classed("selected", true);
      grantKind.filter(true);
      renderAll();
    });

    var brushing = false;

    var lazyMap = _.debounce(mapChart.renderMap, 20);

    var charts = [
      barChart()
          .dimension(grantSum)
          .group(grantSums)
        .axis(d3.svg.axis().orient("bottom").tickFormat(d3.scale.log().tickFormat(1, formatNumber), 10))
        .x(d3.scale.log()
          .domain([800, 250000000])
          .range([0, chartWidth])),

      barChart()
          .dimension(date)
          .group(dates)
          .round(d3.time.day.round)
        .x(d3.time.scale()
          .domain([new Date(2005, 0, 1), new Date(2011, 12, 21)])
          .rangeRound([0, chartWidth]))
    ];

    window.charts = charts;

    var chart = d3.selectAll(".chart")
        .data(charts)
        .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });


    d3.selectAll(".title")
      .style("display", "block")
      .style("opacity", "0")
      .transition()
        .duration(400)
        .style("opacity", "1");


    // Render the initial lists.
    var list = d3.selectAll("#inner-grant-list")
        .data([grantList]);

    // Renders the specified chart or list.
    function render(method) {
      d3.select(this).call(method);
    }

    // Whenever the brush moves, re-render everything.
    function renderAll() {
      naceCodeSums.resetMany();
      chart.each(render);
      list.each(render);
      d3.select("#active").text(formatNumber(all.value()));
      d3.select("#sum-total").text(formatNumber(sumTotal.value().grants + sumTotal.value().loans));
      lazyMap();
      if (!brushing) {
        icicle.update();
      }
    }

    window.renderAll = renderAll;

    window.filter = function(filters) {
      filters.forEach(function(d, i) { charts[i].filter(d); });
      renderAll();
    };

    window.reset = function(i) {
      charts[i].filter(null);
      renderAll();
    };

    function grantList(div) {
      var grants = grantSum.top(101);

      div.each(function() {
        var grant = d3.select(this).selectAll(".grant")
            .data(grants, function(d) { return d.index; });

        var grantEnter = grant.enter().append("div")
            .attr("class", "grant");

        grantEnter.append("div")
            .attr("class", "client")
            .append("a")
              .attr("target", "_blank")
              .attr("href", function(d) { return "http://google.com/search?q=" + escape(d.client); })
              .text(function(d) { return d.client + " (" + d.date.getFullYear() + ")"; });

        grantEnter.append("div")
            .attr("class", "grant-sum")
            .classed("is-loan", function(d) { return d.isLoan; })
            .text(function(d) { return formatNumber(d.grant) + ",-"; });

        grantEnter.append("div")
            .attr("class", "loan-status")
            .classed("is-loan", function(d) { return d.isLoan; })
            .text(function(d) { return d.isLoan ? "loan" : "grant"; });

        grantEnter.append("div")
            .attr("class", "nace-code")
            .text(function(d) { return d.nace; });

        grantEnter.append("div")
            .attr("class", "nace-desc")
            .text(function(d) { return d.naceDesc; });

        grant.order();
        grant.exit().remove();
      });

      if (grants.length > 100 ) {
        d3.select("#grant-list-overflow")
          .style("display", "block")
      } else {
        d3.select("#grant-list-overflow")
          .style("display", "none")
      }


    }

    function barChart() {
      if (!barChart.id) barChart.id = 0;

      var margin = {top: 10, right: 10, bottom: 20, left: 12},
          x,
          y = d3.scale.linear().range([110, 0]),
          id = barChart.id++,
          axis = d3.svg.axis().orient("bottom"),
          brush = d3.svg.brush(),
          brushDirty,
          dimension,
          group,
          round;

      function chart(div) {
        var width = x.range()[1],
            height = y.range()[0];

        y.domain([0, group.top(1)[0].value]);

        div.each(function() {
          var div = d3.select(this),
              g = div.select("g");

          // Create the skeletal chart.
          if (g.empty()) {
            div.select(".title").append("a")
                .attr("href", "javascript:reset(" + id + ")")
                .attr("class", "reset")
                .text("reset")
                .style("display", "none");

            g = div.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            g.style("opacity", "0")
              .transition()
                .duration(400)
                .style("opacity", "1");

            g.append("clipPath")
                .attr("id", "clip-" + id)
              .append("rect")
                .attr("width", width)
                .attr("height", height);

            g.selectAll(".bar")
                .data(["background", "foreground"])
              .enter().append("path")
                .attr("class", function(d) { return d + " bar"; })
                .datum(group.all());

            g.selectAll(".foreground.bar")
                .attr("clip-path", "url(#clip-" + id + ")");

            g.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(0," + height + ")")
                .call(axis);

            // Initialize the brush component with pretty resize handles.
            var gBrush = g.append("g").attr("class", "brush").call(brush);
            gBrush.selectAll("rect").attr("height", height);
            gBrush.selectAll(".resize").append("path").attr("d", resizePath);
          }

          // Only redraw the brush if set externally.
          if (brushDirty) {
            brushDirty = false;
            g.selectAll(".brush").call(brush);
            div.select(".title a").style("display", brush.empty() ? "none" : null);
            if (brush.empty()) {
              g.selectAll("#clip-" + id + " rect")
                  .attr("x", 0)
                  .attr("width", width);
            } else {
              var extent = brush.extent();
              g.selectAll("#clip-" + id + " rect")
                  .attr("x", x(extent[0]))
                  .attr("width", x(extent[1]) - x(extent[0]));
            }
          }
          g.selectAll(".bar").attr("d", barPath);
        });

        function barPath(groups) {
          var path = [],
              i = 0,
              n = groups.length,
              d;
          while (++i < n) {
            d = groups[i];
            path.push("M", x(d.key), ",", height, "V", y(d.value), "h1V", height);
          }
          return path.join("");
        }

        function resizePath(d) {
          var e = +(d == "e"),
              x = e ? 1 : -1,
              y = height / 3;
          return "M" + (0.5 * x) + "," + y
              + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
              + "V" + (2 * y - 6)
              + "A6,6 0 0 " + e + " " + (0.5 * x) + "," + (2 * y)
              + "Z"
              + "M" + (2.5 * x) + "," + (y + 8)
              + "V" + (2 * y - 8)
              + "M" + (4.5 * x) + "," + (y + 8)
              + "V" + (2 * y - 8);
        }
      }

      brush.on("brushstart.chart", function() {
        brushing = true;
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title a").style("display", null);
      });

      brush.on("brush.chart", function() {
        var g = d3.select(this.parentNode),
            extent = brush.extent();
        if (round) g.select(".brush")
            .call(brush.extent(extent = extent.map(round)))
          .selectAll(".resize")
            .style("display", null);
        g.select("#clip-" + id + " rect")
            .attr("x", x(extent[0]))
            .attr("width", x(extent[1]) - x(extent[0]));
        dimension.filterRange(extent);
      });

      brush.on("brushend.chart", function() {
        brushing = false;
        if (brush.empty()) {
          var div = d3.select(this.parentNode.parentNode.parentNode);
          div.select(".title a").style("display", "none");
          div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
          dimension.filterAll();
        }
      });

      chart.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
      };

      chart.x = function(_) {
        if (!arguments.length) return x;
        x = _;
        axis.scale(x);
        brush.x(x);
        return chart;
      };

      chart.axis = function(_) {
        if (!arguments.length) return axis;
        axis = _;
        return chart;
      };

      chart.y = function(_) {
        if (!arguments.length) return y;
        y = _;
        return chart;
      };

      chart.dimension = function(_) {
        if (!arguments.length) return dimension;
        dimension = _;
        return chart;
      };

      chart.filter = function(_) {
        if (_) {
          brush.extent(_);
          dimension.filterRange(_);
        } else {
          brush.clear();
          dimension.filterAll();
        }
        brushDirty = true;
        return chart;
      };

      chart.group = function(_) {
        if (!arguments.length) return group;
        group = _;
        return chart;
      };

      chart.round = function(_) {
        if (!arguments.length) return round;
        round = _;
        return chart;
      };

      return d3.rebind(chart, brush, "on");
    }

    grantsLoaded.resolve();

  });
}();
})();
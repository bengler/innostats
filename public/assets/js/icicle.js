window.icicle = function () {

  var w = 703,
      h = 200,
      x = d3.scale.linear().range([0, w]),
      y = d3.scale.linear().range([0, h]);

  var chosenNode, rootNode;

  var vis = d3.select("#nace-icicle").append("div")
    .attr("class", "icicleChart")
    .style("width", w + "px")
    .style("height", h + "px")
    .append("svg:svg")
    .attr("width", w)
    .attr("height", h);

  var icicleExpanded = -1;
  var originalIcicleContainerHeight = $('#nace-icicle-container').height()

  function toggleIcicleHeight() {
    if (icicleExpanded > 0) {
      short();
    } else {
      tall();
    }
    icicleExpanded *= -1;
  }

  function tall() {
    var height = $(window).height() - $('.icicleChart svg').position().top - 80;
    $('.icicleHeightIndicator').text("▼")
    changeHeight(height);
    renderAll();
    fadeOtherCharts("0");
  };

  function short() {
    $('.icicleHeightIndicator').text("►")
    changeHeight(200);
    renderAll();
    fadeOtherCharts("1");
  };

  d3.select('.toggleIcicleHeight').on("click", function(d,i) {
    toggleIcicleHeight();
  });

  function changeHeight(newHeight) {
    h = newHeight;
    d3.selectAll('#nace-icicle-container')
      .transition()
      .duration(900)
      .style("height", h + 40 + "px");
    d3.selectAll('.icicleChart svg')
      .transition()
      .duration(900)
      .style("height", h + "px");
    x = d3.scale.linear().range([0, w]),
    y = d3.scale.linear().range([0, h]);
  }

  function fadeOtherCharts(opacity) {
    d3.select('#right-column')
      .transition()
      .duration(400)
      .style("opacity", opacity);
    d3.selectAll('#charts')
      .transition()
      .duration(400)
      .style("opacity", opacity);
  }

  function label(d) {
    var code = d.code;
    if (code.match(/^0\d$/)) {
      code = code.charAt(1);
    }
    var name = code + ":" + naceDescriptions[code]  || "EVERYTHING";
    return name;
  }

  function naceValue(d) {
    var obj = naceCodeKeys[d.code];
    if (obj === undefined) {
      return 0;
    } else {
      return obj.value.grants;
    }
  }

  function lowerBoundary(d) {
    var result = +(d.code);
    if (isNaN(result)) {
      result = +(d.lower_boundary);

    }
    return result;
  }

  function transform(d, ky) {
    return "translate(8," + d.dx * ky / 2 + ")";
  }

  function rectColor(d) {
    var val = (d3.hsl(180 + (+lowerBoundary(d)) * 2.1, 0.9 / (d.depth / 1.5) , 0.80 * (1- (d.depth / 12))).rgb());
    return val
  }

  return {
    init: function() {

      d3.select("#nace-icicle-container .title").append("a")
        .attr("href", "javascript:window.icicle.resetIcicle()")
        .attr("class", "reset")
        .text("reset")
        .style("display", "none");

      var partition = d3.layout.partition()
        .value(naceValue)
        .internal_value(naceValue);

      var partionedTree = partition.nodes(naceHierarchy);
      rootNode = partionedTree[0];
      chosenNode = rootNode;

      var g = vis.selectAll("g")
          .data(partionedTree, function(d) { return d["case"]; })
        .enter().append("svg:g")
          .attr("transform", function(d) { return "translate(" + x(d.y) + "," + y(d.x) + ")"; })
          .on("click", this.click);

      var kx = w / naceHierarchy.dx,
          ky = h / 1;

      g.append("svg:rect")
          .attr("width", naceHierarchy.dy * kx)
          .attr("height", function(d) { return (d.dx * ky) || 0; })
          .style("fill", rectColor);

      g.append("svg:text")
          .attr("transform", function(d) { return transform(d,ky); })
          .attr("dy", ".35em")
          .style("opacity", function(d) { return d.dx * ky > 12 ? 0.8 : 0; })
          .text(label);
      g.append("svg:title")
        .text(label);

      // d3.select(window)
      //     .on("click", function() { click(naceHierarchy); });
    },
    click: function(d) {
      console.info(d);
      if (d !== rootNode) {
        if (chosenNode == rootNode) {
          d3.select("#nace-icicle-container .title a")
            .style("display", null);
        }
      } else {
        d3.select("#nace-icicle-container .title a")
          .style("display", "none");
      }
      chosenNode = d;
      var range = [lowerBoundary(chosenNode), +chosenNode.upper_boundary];
      window.naceCodeSum.filterRange(range);
      renderAll();
    },
    resetIcicle: function () {
      this.click(rootNode);
    },
    update: function() {
      if (all.value() === 0) {
        return
      }

      var partition = d3.layout.partition()
        .value(naceValue)
        .internal_value(naceValue);

      d = chosenNode;

      vis.selectAll("g").data(partition.nodes(naceHierarchy), function(d) { return d["case"]; });

      d = chosenNode;

      kx = (d.y ? w - 40 : w) / (1 - d.y);
      ky = h / d.dx;
      x.domain([d.y, 1]).range([d.y ? 40 : 0, w]);
      y.domain([d.x, d.x + d.dx]);

      var g = vis.selectAll("g");

      var t = g.transition()
          .duration(600)
          .attr("transform", function(d) { return "translate(" + x(d.y) + "," + y(d.x) + ")"; });

      t.select("rect")
          .attr("width", d.dy * kx)
          .attr("height", function(d) { return d.dx * ky; });

      t.select("text")
          .attr("transform", function(d) { return transform(d,ky); })
          .style("opacity", function(d) { return d.dx * ky > 12 ? 0.8 : 0; });
    }
  };
}();


window.treeMap = function () {

  var width = 470,
      height = 450,
      color = d3.scale.category20c();
      // color = d3.scale.ordinal()
      // .range(["#009fb4", "#e97100", "#666", "#aaa"]);

  var treemap;

  var div = d3.select("#nace-treemap").append("div")
      .style("position", "relative")
      .style("width", width + "px")
      .style("height", height + "px");

  function cell() {
    this
        .style("left", function(d) { return d.x + "px"; })
        .style("top", function(d) { return d.y + "px"; })
        .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
        .style("height", function(d) { return Math.max(0, d.dy - 1) + "px"; });
  }

  function naceValue(d) {
    var obj = naceCodeKeys[+d.code];
    if (obj === undefined) {
      return 0;
    } else {
      return obj.value.value;
    }
  }

  return {
    init: function() {
      treemap = d3.layout.treemap()
            .size([width, height])
            .sticky(true)
            .value(naceValue);

      var json = naceHierarchy;
      div.data([json]).selectAll("div")
          .data(treemap.nodes)
        .enter().append("div")
          .attr("class", "cell")
          .style("background", function(d) { return d.children ? color(d.code.match(/(\d*)./)) : null; })
          .call(cell)
          .attr("title", function(d) { return d.value.sum; })
          .text(function(d) { return d.children ? null : d.code + ":" + naceDescriptions[d.code]; });

      d3.select("#size").on("click", function() {
        div.selectAll("div")
            .data(treemap.value(function(d) { return d.size; }))
          .transition()
            .duration(1500)
            .call(cell);

        d3.select("#size").classed("active", true);
        d3.select("#count").classed("active", false);
      });

      d3.select("#count").on("click", function() {
        div.selectAll("div")
            .data(treemap.value(function(d) { return 1; }))
          .transition()
            .duration(1500)
            .call(cell);

        d3.select("#size").classed("active", false);
        d3.select("#count").classed("active", true);
      });
      return this;
    },
    update: function() {
      div.selectAll("div")
          .data(treemap.value(naceValue))
          .call(cell);
    }
  };
}();


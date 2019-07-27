let margin = {top: 20, right: 50, bottom: 50, left: 50};
let width = 1000 - margin.left - margin.right;
let height = 400 - margin.top - margin.bottom;

function tree(data) {
    const root = d3.hierarchy(data);
    root.dx = 10;
    root.dy = width / (root.height + 1);
    //return d3.tree().size([height, width])(root);
    return d3.tree().nodeSize([50,50])(root);
}

function drawTree(data) {
    const root = tree(data);

    let x0 = Infinity;
    let x1 = -x0;
    root.each(d => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
    });

    const svg = d3.select("svg");

    const g = svg
        .append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
    //    .attr("transform", `translate(${margin.left}, ${margin.top})`);
        .attr("transform", `translate(200,200)`);

    const link = g
        .append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(root.links())
        .join("path")
        .attr(
            "d",
            d3
                .linkHorizontal()
                .x(d => d.y)
                .y(d => d.x)
        );

    const node = g
        .append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.y},${d.x})`);

    node.append("circle")
        .attr("fill", d => (d.children ? "#555" : "#999"))
        .attr("r", 20);

    node.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => (d.children ? -6 : 6))
        .attr("text-anchor", d => "middle")
        .text(d => d.data.retval)
        .clone(true)
        .lower()
        .attr("stroke", "white");

    return svg.node();
}

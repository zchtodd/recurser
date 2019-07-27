let width = 1000;
let height = 400;

let NODE_SIZE = 30;
let NODE_SEP = NODE_SIZE * 2 + 10;

class Node {
    constructor(x, y, prevSibling) {
        this.x = x;
        this.y = y;
        this.finalX = 0;
        this.modifier = 0;

        this.prevSibling = prevSibling;
        this.children = [];
    }
}

function calculateInitialValues(node) {
    for (let i = 0; i < node.children.length; i++) {
        calculateInitialValues(node.children[i]);
    }

    if (node.prevSibling) {
        node.x = node.prevSibling.x + 3;
    } else {
        node.x = 0;
    }

    if (node.children.length == 1) {
        node.modifier = node.x;
    } else if (node.children.length >= 2) {
        let totalX = 0;
        for (let i = 0; i < node.children.length; i++) {
            totalX += node.children[i].x;
        }
        node.modifier = node.x - totalX / 2;
    }
}

function calculateFinalValues(node, modSum) {
    node.finalX = node.x + modSum;
    for (let i = 0; i < node.children.length; i++) {
        calculateFinalValues(node.children[i], node.modifier + modSum);
    }
}

function buildTree(dataNode, prevSibling, level) {
    let root = new Node(0, level, prevSibling);
    for (let i = 0; i < dataNode.children.length; i++) {
        root.children.push(
            buildTree(
                dataNode.children[i],
                i >= 1 ? root.children[i - 1] : null,
                level + 1
            )
        );
    }
    return root;
}

function getDimensions(root) {
    let minWidth = Infinity;
    let maxWidth = -minWidth;

    let minHeight = Infinity;
    let maxHeight= -minWidth;

    let nodes = [root];
    while (nodes.length) {
        let node = nodes.shift();
        nodes = nodes.concat(node.children);

        if (node.finalX < minWidth) {
            minWidth = node.finalX;
        }

        if (node.finalX > maxWidth) {
            maxWidth = node.finalX;
        }

        if (node.y < minHeight) {
            minHeight = node.y;
        }

        if (node.y > maxHeight) {
            maxHeight = node.y;
        }
    }
    return [maxWidth - minWidth, maxHeight - minHeight];
}

function drawTree(svg, data) {
    let root = buildTree(data, null, 0);

    calculateInitialValues(root);
    calculateFinalValues(root, 0);

    let [treeHeight, treeWidth] = getDimensions(root);
    let levelWidth = width / (treeWidth + 1);
    let levelHeight = height / (treeHeight + 1);

    NODE_SIZE = Math.min(NODE_SIZE, levelWidth, levelHeight);

    let nodes = [root];
    while (nodes.length) {
        let node = nodes.shift();    
        
        /*
        for (let i = 0; i < node.children.length; i++) {
            let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", node.finalX * NODE_SEP);
            line.setAttribute("y1", node.y * NODE_SEP);
            line.setAttribute("x2", node.children[i].finalX * NODE_SEP);
            line.setAttribute("y2", node.children[i].y * NODE_SEP);
            line.setAttribute("stroke", "red");

    		svg.appendChild(line);
        }
        */


        nodes = nodes.concat(node.children);

        let circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        let x = node.finalX * levelHeight + levelHeight / 2 - NODE_SIZE / 2;
        let y = node.y * levelWidth + levelWidth / 2 - NODE_SIZE / 2;

		circ.setAttribute("cx", x);
		circ.setAttribute("cy", y);
		circ.setAttribute("fill", "red");
		circ.setAttribute("r", NODE_SIZE);

		svg.appendChild(circ);
    }
}

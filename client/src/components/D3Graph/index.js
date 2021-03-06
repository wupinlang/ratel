// Copyright 2018 Dgraph Labs, Inc. and Contributors
//
// Licensed under the Dgraph Community License (the "License"); you
// may not use this file except in compliance with the License. You
// may obtain a copy of the License at
//
//     https://github.com/dgraph-io/ratel/blob/master/LICENSE

import React from "react";
import * as d3 from "d3";
import { event as currentEvent } from "d3-selection"; // Because https://stackoverflow.com/questions/36887428/d3-event-is-null-in-a-reactjs-d3js-component
import debounce from "lodash/debounce";

import "./D3Graph.scss";

const NODE_RADIUS = 9;
const DOUBLE_CLICK_MS = 250;

const fixedPosForce = () => {
    let self = {
        nodes: [],
    };

    const res = function tick(alpha) {
        self.nodes.forEach(n => {
            if (!n._posFixed) {
                return;
            }
            n.x = n._posFixed.x;
            n.y = n._posFixed.y;
        });
    };

    res.initialize = nodes => (self.nodes = nodes);

    res.setNodeCoords = (node, x, y) => {
        node._posFixed = { x, y };
        node.x = x;
        node.y = y;
    };

    return res;
};

export default class D3Graph extends React.Component {
    constructor(props) {
        super(props);

        this.width = 100;
        this.height = 100;

        this.outer = React.createRef();
    }

    devicePixelRatio = window.devicePixelRatio || 1;

    state = {
        selectedNode: null,
        transform: d3.zoomTransform({
            k: this.devicePixelRatio / 2,
            x: 0,
            y: 0,
        }),
    };

    document = {
        nodes: [],
        edges: [],
    };

    _drawAll = () => {
        const context = this.canvasContext;
        if (!context) {
            return;
        }

        context.save();
        const { devicePixelRatio: dpr } = this;
        context.clearRect(0, 0, this.width * dpr, this.height * dpr);

        context.translate(
            this.state.transform.x + (this.width * dpr) / 2,
            this.state.transform.y + (this.height * dpr) / 2,
        );
        context.scale(this.state.transform.k, this.state.transform.k);

        context.clearRect(0, 0, this.width, this.height);

        context.lineWidth = 0.5;

        this.document.edges.forEach(function(d) {
            context.beginPath();
            context.moveTo(d.source.x, d.source.y);
            context.lineTo(d.target.x, d.target.y);
            context.stroke();
        });

        // Draw the nodes
        this.document.nodes.forEach((d, i) => {
            context.fillStyle = d.color ? d.color : "#ccc";
            context.strokeStyle = "#c63";

            context.beginPath();
            context.arc(d.x, d.y, NODE_RADIUS, 0, 2 * Math.PI, true);
            context.fill();
            context.stroke();

            if (d === this.state.selectedNode) {
                context.lineWidth = 1.5;
                context.beginPath();
                context.arc(d.x, d.y, NODE_RADIUS, 0, 2 * Math.PI, true);
                context.stroke();
                context.lineWidth = 0.5;
            }
        });

        context.restore();
    };

    drawGraph = debounce(this._drawAll, 5, { leading: true, trailing: true });

    setForces = (width, height) => {
        this.d3simulation
            .alphaTarget(0.1)
            .alphaMin(0.10001)
            .alphaDecay(0.04)
            .velocityDecay(0.09)
            .force(
                "link",
                d3
                    .forceLink()
                    .distance(60)
                    .strength(0.05)
                    .id(d => d.id)
                    .links(this.document.edges),
            )
            .force("center", d3.forceCenter(0, 0))
            .force("x", d3.forceX(0).strength((0.01 * height) / width))
            .force("y", d3.forceY(0).strength((0.01 * width) / height))
            .force("charge", d3.forceManyBody().strength(-10))
            .force("fixedPosForce", fixedPosForce());

        this.fixedPosForce = this.d3simulation.force("fixedPosForce");
    };

    componentDidMount() {
        this.d3simulation = d3.forceSimulation().on("tick", this.drawGraph);

        this.graphCanvas = d3
            .select(this.outer.current)
            .append("canvas")
            .attr("width", this.width)
            .attr("height", this.height)
            .node();

        this.zoomBehavior = d3
            .zoom()
            .scaleExtent([1 / 4, 4])
            .on("zoom", this.onZoom);

        d3.select(this.graphCanvas)
            .on("click", this.onMouseDown)
            .on("dblclick", this.onDoubleClick)
            .on("mousemove", this.onClick)
            .call(
                d3
                    .drag()
                    .subject(this.dragsubject)
                    .on("start", this.dragstarted)
                    .on("drag", this.dragged),
            )
            .call(this.zoomBehavior);

        this.onResize();
        this.updateDocument(this.props.nodes, this.props.edges);

        this.resizeObserver = window.setInterval(this.onResize, 500);
    }

    componentWillUnmount() {
        clearInterval(this.resizeObserver);
    }

    getD3EventCoords = event => {
        const { devicePixelRatio: dpr } = this;

        return this.state.transform.invert([
            event.x * dpr - (this.width * dpr) / 2,
            event.y * dpr - (this.height * dpr) / 2,
        ]);
    };

    findNodeAtPos = (x, y) => {
        let minI = -1;
        let minD = 1e10;
        this.document.nodes.forEach((n, i) => {
            const d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
            if (d < minD) {
                minI = i;
                minD = d;
            }
        });

        if (minI < 0 || minD > NODE_RADIUS * NODE_RADIUS) {
            return null;
        }
        return this.document.nodes[minI];
    };

    onMouseMove = () => {
        const { offsetX: x, offsetY: y } = currentEvent;
        const pt = this.getD3EventCoords({ x, y });

        const node = this.findNodeAtPos(...pt);
        if (node && this.props.onNodeHovered) {
            this.props.onNodeHovered(node);
        }
    };

    onClick = () => {
        const { offsetX: x, offsetY: y } = currentEvent;
        const pt = this.getD3EventCoords({ x, y });

        const node = this.findNodeAtPos(...pt);
        if (node) {
            currentEvent.stopImmediatePropagation();
            return this.props.onNodeSelected(node);
        }
    };

    onDoubleClick = () => {
        const { offsetX: x, offsetY: y } = currentEvent;
        const pt = this.getD3EventCoords({ x, y });

        const node = this.findNodeAtPos(...pt);
        if (node) {
            currentEvent.stopImmediatePropagation();
            return this.props.onNodeDoubleClicked(node);
        }
    };

    dragsubject = () => {
        const { offsetX: x, offsetY: y } = currentEvent.sourceEvent;
        const pt = this.getD3EventCoords({ x, y });

        const selectedNode = this.findNodeAtPos(...pt);

        this.setState({
            selectedNode: selectedNode,
        });
        if (this.props.onNodeSelected) {
            this.props.onNodeSelected(selectedNode);
        }
        return selectedNode;
    };

    dragstarted = () => {
        if (!currentEvent.active) {
            setTimeout(
                () => this.d3simulation.alpha(0.5).restart(),
                DOUBLE_CLICK_MS,
            );
        }
    };

    dragged = () => {
        const { offsetX: x, offsetY: y } = currentEvent.sourceEvent;
        const pt = this.getD3EventCoords({ x, y });

        this.fixedPosForce.setNodeCoords(currentEvent.subject, ...pt);
        this.drawGraph();

        this.d3simulation.alpha(Math.max(0.12, this.d3simulation.alpha()));
    };

    onZoom = () => {
        if (Date.now() - this.lastDoubleClickTime < 5) {
            return;
        }
        this.setState({ transform: currentEvent.transform });
    };

    onResize = () => {
        let resized = false;
        if (this.outer.current) {
            const el = this.outer.current;

            resized |= this.width !== el.offsetWidth;
            resized |= this.height !== el.offsetHeight;

            this.width = el.offsetWidth;
            this.height = el.offsetHeight;
        }

        if (!resized) {
            return;
        }

        const { width, height } = this;

        this.setForces(width, height);

        d3.select(this.graphCanvas)
            .attr("width", this.width * this.devicePixelRatio)
            .attr("height", this.height * this.devicePixelRatio);

        this.canvasContext = this.graphCanvas.getContext("2d");

        this._drawAll();
    };

    updateDocument = (nodes, edges) => {
        if (!this.d3simulation || !nodes || !edges) {
            return;
        }

        if (
            this.document.nodesLength !== nodes.length ||
            this.document.edgesLength !== edges.length
        ) {
            this.d3simulation.alpha(1).restart();
        }

        this.document = {
            edges,
            edgesLength: edges.length,
            nodes,
            nodesLength: nodes.length,
        };

        this.d3simulation.nodes(nodes);
        this.d3simulation.force("link").links(edges);
    };

    render() {
        this.onResize();
        this.drawGraph();

        this.updateDocument(this.props.nodes, this.props.edges);

        return <div ref={this.outer} className="graph-outer" />;
    }
}

// Copyright 2017-2018 Dgraph Labs, Inc. and Contributors
//
// Licensed under the Dgraph Community License (the "License"); you
// may not use this file except in compliance with the License. You
// may obtain a copy of the License at
//
//     https://github.com/dgraph-io/ratel/blob/master/LICENSE

import React from "react";
import classnames from "classnames";
import { connect } from "react-redux";

import FrameCodeTab from "./FrameCodeTab";
import GraphContainer from "../containers/GraphContainer";
import SessionFooter from "./SessionFooter";
import EntitySelector from "./EntitySelector";
import GraphIcon from "./GraphIcon";
import TreeIcon from "./TreeIcon";

import { getNodeLabel, shortenName } from "../lib/graph";
import { updateFrame, updateFramesTab } from "../actions/frames";

class FrameSession extends React.Component {
    constructor(props) {
        super(props);
        const { framesTab, parsedResponse } = props;

        this.state = {
            // Tabs: "query", "graph", "tree", "json".
            currentTab: framesTab,
            graphRenderStart: null,
            graphRenderEnd: null,
            treeRenderStart: null,
            treeRenderEnd: null,
            isTreePartial: false,
            configuringNodeType: null,
        };

        this.nodes = parsedResponse.nodes;
        this.edges = parsedResponse.edges;
    }

    componentDidMount() {
        const { onJsonClick, rawResponse } = this.props;
        if (this.state.currentTab === "code" && rawResponse == null) {
            onJsonClick();
        }
    }

    handleUpdateLabelRegex = val => {
        const { frame, changeRegexStr } = this.props;
        changeRegexStr(frame, val);
    };

    handleBeforeGraphRender = () => {
        this.setState({ graphRenderStart: new Date() });
    };

    handleGraphRendered = () => {
        this.setState({ graphRenderEnd: new Date() });
    };

    handleBeforeTreeRender = () => {
        this.setState({ treeRenderStart: new Date() });
    };

    handleTreeRendered = () => {
        this.setState({ treeRenderEnd: new Date() });
    };

    handleInitNodeTypeConfig = nodeType => {
        const { configuringNodeType } = this.state;

        let nextValue;
        if (configuringNodeType === nodeType) {
            nextValue = "";
        } else {
            nextValue = nodeType;
        }
        this.setState({ configuringNodeType: nextValue });
    };

    navigateTab = tabName => {
        const { onJsonClick, data, updateFramesTab } = this.props;
        this.setState(
            {
                currentTab: tabName,
            },
            () => updateFramesTab(tabName),
        );

        if (tabName === "code" && data == null) {
            onJsonClick();
        }
    };

    getGraphRenderTime = () => {
        const { graphRenderStart, graphRenderEnd } = this.state;
        if (!graphRenderStart || !graphRenderEnd) {
            return;
        }

        return graphRenderEnd.getTime() - graphRenderStart.getTime();
    };

    getTreeRenderTime = () => {
        const { treeRenderStart, treeRenderEnd } = this.state;
        if (!treeRenderStart || !treeRenderEnd) {
            return;
        }

        return treeRenderEnd.getTime() - treeRenderStart.getTime();
    };

    handleUpdateLabels = () => {
        const {
            frame: {
                meta: { regexStr },
            },
        } = this.props;
        if (!regexStr) {
            return;
        }

        const re = new RegExp(regexStr, "i");
        const allNodes = this.nodes.get();
        const updatedNodes = allNodes.map(node => {
            const { properties } = node;
            const fullName = getNodeLabel(properties.attrs, re);
            const displayLabel = shortenName(fullName);
            return { ...node, label: displayLabel };
        });

        this.nodes.update(updatedNodes);
    };

    handleExpandNode = uid => {
        const { dispatchAddExtraQuery, frame } = this.props;

        const query = `{
  node(func:uid(${uid})) {
    expand(_all_) {
      uid
      expand(_all_)
    }
  }
}`;
        dispatchAddExtraQuery(query, frame);
    };

    renderToolbar = currentTab => (
        <ul className="toolbar">
            <li>
                <button
                    className={classnames({
                        active: currentTab === "graph",
                    })}
                    onClick={() => this.navigateTab("graph")}
                >
                    <div className="icon-container">
                        <GraphIcon />
                    </div>
                    <span className="menu-label">Graph</span>
                </button>
            </li>
            <li>
                <button
                    className={classnames({
                        active: currentTab === "tree",
                    })}
                    onClick={() => this.navigateTab("tree")}
                >
                    <div className="icon-container">
                        <TreeIcon />
                    </div>
                    <span className="menu-label">Tree</span>
                </button>
            </li>
            <li>
                <button
                    className={classnames({
                        active: currentTab === "code",
                    })}
                    onClick={() => this.navigateTab("code")}
                >
                    <div className="icon-container">
                        <i className="icon fa fa-code" />
                    </div>

                    <span className="menu-label">JSON</span>
                </button>
            </li>
        </ul>
    );

    render() {
        const {
            rawResponse,
            parsedResponse,
            frame,
            onExpandResponse,
            handleNodeHovered,
            handleNodeSelected,
            hoveredNode,
            selectedNode,
        } = this.props;
        const {
            currentTab,
            configuringNodeType,
            isConfiguringLabel,
        } = this.state;

        return (
            <div className="body">
                {this.renderToolbar(currentTab)}
                <div className="content">
                    <div className="main">
                        {currentTab === "graph" ? (
                            <div className="content-container">
                                <GraphContainer
                                    edgesDataset={this.edges}
                                    onExpandResponse={onExpandResponse}
                                    key={currentTab}
                                    nodesDataset={this.nodes}
                                    onBeforeRender={
                                        this.handleBeforeGraphRender
                                    }
                                    onExpandNode={this.handleExpandNode}
                                    onRendered={this.handleGraphRendered}
                                    onRunQuery={this.props.onRunQuery}
                                    onNodeHovered={handleNodeHovered}
                                    onNodeSelected={handleNodeSelected}
                                    parsedResponse={parsedResponse}
                                    selectedNode={selectedNode}
                                />
                            </div>
                        ) : null}

                        {currentTab === "tree" ? (
                            <div className="content-container">
                                <GraphContainer
                                    edgesDataset={this.edges}
                                    onExpandResponse={onExpandResponse}
                                    key={currentTab}
                                    nodesDataset={this.nodes}
                                    onBeforeRender={this.handleBeforeTreeRender}
                                    onExpandNode={this.handleExpandNode}
                                    onRendered={this.handleTreeRendered}
                                    onRunQuery={this.props.onRunQuery}
                                    onNodeSelected={handleNodeSelected}
                                    onNodeHovered={handleNodeHovered}
                                    parsedResponse={parsedResponse}
                                    selectedNode={selectedNode}
                                    treeView
                                />
                            </div>
                        ) : null}

                        {currentTab === "code" ? (
                            <FrameCodeTab
                                query={frame.query}
                                rawResponse={rawResponse}
                            />
                        ) : null}

                        {currentTab === "graph" || currentTab === "tree" ? (
                            <EntitySelector
                                response={parsedResponse}
                                onInitNodeTypeConfig={
                                    this.handleInitNodeTypeConfig
                                }
                                labelRegexStr={frame.meta.regexStr}
                                onUpdateLabelRegex={this.handleUpdateLabelRegex}
                                onUpdateLabels={this.handleUpdateLabels}
                            />
                        ) : null}

                        <SessionFooter
                            response={parsedResponse}
                            currentTab={currentTab}
                            selectedNode={selectedNode}
                            hoveredNode={hoveredNode}
                            configuringNodeType={configuringNodeType}
                            graphRenderTime={this.getGraphRenderTime()}
                            treeRenderTime={this.getTreeRenderTime()}
                            isConfiguringLabel={isConfiguringLabel}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

function mapDispatchToProps(dispatch) {
    return {
        updateFramesTab(tab) {
            return dispatch(updateFramesTab(tab));
        },
        changeRegexStr(frame, regexStr) {
            return dispatch(
                updateFrame({
                    ...frame,
                    meta: {
                        ...frame.meta,
                        regexStr,
                    },
                }),
            );
        },
        dispatchAddExtraQuery(extraQuery, frame) {
            return dispatch(
                updateFrame({
                    ...frame,
                    extraQuery,
                    version: frame.version + 1,
                }),
            );
        },
    };
}

export default connect(
    null,
    mapDispatchToProps,
)(FrameSession);

// Copyright 2017-2018 Dgraph Labs, Inc. and Contributors
//
// Licensed under the Dgraph Community License (the "License"); you
// may not use this file except in compliance with the License. You
// may obtain a copy of the License at
//
//     https://github.com/dgraph-io/ratel/blob/master/LICENSE

import React from "react";
import TransitionGroup from "react-transition-group/TransitionGroup";
import CSSTransition from "react-transition-group/CSSTransition";

import FrameItem from "./FrameItem";

import "../assets/css/Frames.scss";

function min(a, b) {
    return a < b ? a : b;
}

export default class FrameList extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            count: min(props.frames.length, 10),
        };
    }

    loadMore = event => {
        event && event.preventDefault();
        this.setState(({ count }) => {
            return {
                count: count + 10,
            };
        });
    };

    render() {
        const {
            frames,
            framesTab,
            onDiscardFrame,
            onSelectQuery,
            onUpdateConnectedState,
            collapseAllFrames,
            patchFrame,
            updateFrame,
            url,
        } = this.props;
        const { count } = this.state;

        let finalFrames;
        let loadMoreButton = null;
        if (frames.length > count) {
            finalFrames = frames.slice(0, count);
            loadMoreButton = (
                <div className="text-center" style={{ marginTop: "10px" }}>
                    <button className="btn btn-default" onClick={this.loadMore}>
                        Load older queries
                    </button>
                </div>
            );
        } else {
            finalFrames = frames;
        }

        return (
            <div className="frame-list-outer">
                <TransitionGroup component="ul" className="frame-list">
                    {finalFrames.map(frame => {
                        return (
                            <CSSTransition
                                key={frame.id}
                                classNames="frame-item"
                                timeout={{ enter: 300, exit: 300 }}
                            >
                                <FrameItem
                                    frame={frame}
                                    framesTab={framesTab}
                                    onDiscardFrame={onDiscardFrame}
                                    onSelectQuery={onSelectQuery}
                                    onUpdateConnectedState={
                                        onUpdateConnectedState
                                    }
                                    collapseAllFrames={collapseAllFrames}
                                    patchFrame={patchFrame}
                                    updateFrame={updateFrame}
                                    url={url}
                                />
                            </CSSTransition>
                        );
                    })}
                </TransitionGroup>
                {loadMoreButton}
            </div>
        );
    }
}

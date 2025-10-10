package com.example.demo.classes;

import java.util.ArrayList;
import java.util.List;

public class Viewers {

    private List<Viewer> viewerList;

    public List<Viewer> getViewerList() {
        if (viewerList == null) {
            viewerList = new ArrayList<>();
        }
        return viewerList;
    }

    public void setViewerList(List<Viewer> viewerList) {
        this.viewerList = viewerList;
    }
}
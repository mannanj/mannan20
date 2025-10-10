package com.example.demo.classes;

import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public class ViewersDAO {

    private static Viewers viewers = new Viewers();

    static {
        viewers.getViewerList()
          .add(new Viewer(generateId(), "Prem Tiwari", "prem@gmail.com", "Interest in content"));
        viewers.getViewerList()
          .add(new Viewer(generateId(), null, "vikash@gmail.com", null));
        viewers.getViewerList()
          .add(new Viewer(generateId(), "Ritesh Ojha", null, null));
    }

    private static String generateId() {
        return UUID.randomUUID().toString();
    }

    public Viewers getAllViewers() {
        return viewers;
    }

    public Viewer addViewer(Viewer viewer) {
        viewer.setId(generateId());
        viewers.getViewerList().add(viewer);
        return viewer;
    }

    public Viewer getViewerById(String id) {
        return viewers.getViewerList()
          .stream()
          .filter(viewer -> viewer.getId().equals(id))
          .findFirst()
          .orElse(null);
    }

    public Viewer getViewerByEmail(String email) {
        return viewers.getViewerList()
          .stream()
          .filter(viewer -> viewer.getEmail() != null && viewer.getEmail().equalsIgnoreCase(email))
          .findFirst()
          .orElse(null);
    }

    public Viewer getViewerByName(String name) {
        return viewers.getViewerList()
          .stream()
          .filter(viewer -> viewer.getName() != null && viewer.getName().equalsIgnoreCase(name))
          .findFirst()
          .orElse(null);
    }

    public Viewer getViewerByReason(String reason) {
        return viewers.getViewerList()
          .stream()
          .filter(viewer -> viewer.getReason() != null && viewer.getReason().equalsIgnoreCase(reason))
          .findFirst()
          .orElse(null);
    }

    public Viewer updateViewer(String id, Viewer updatedViewer) {
        Viewer existingViewer = getViewerById(id);
        if (existingViewer == null) {
            return null;
        }

        if (updatedViewer.getName() != null && !updatedViewer.getName().trim().isEmpty()) {
            existingViewer.setName(updatedViewer.getName());
        }
        if (updatedViewer.getEmail() != null && !updatedViewer.getEmail().trim().isEmpty()) {
            existingViewer.setEmail(updatedViewer.getEmail());
        }
        if (updatedViewer.getReason() != null && !updatedViewer.getReason().trim().isEmpty()) {
            existingViewer.setReason(updatedViewer.getReason());
        }

        return existingViewer;
    }
}

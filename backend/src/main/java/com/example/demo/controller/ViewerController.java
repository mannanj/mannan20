package com.example.demo.controller;

import com.example.demo.classes.Viewer;
import com.example.demo.classes.Viewers;
import com.example.demo.classes.ViewersDAO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/viewers")
public class ViewerController {

    @Autowired
    private ViewersDAO viewersDao;

    @GetMapping("/")
    public Viewers getViewers() {
        return viewersDao.getAllViewers();
    }

    @GetMapping("/{identifier}")
    public ResponseEntity<Viewer> getViewer(@PathVariable String identifier) {
        Viewer viewer;

        if (identifier.contains("@")) {
            viewer = viewersDao.getViewerByEmail(identifier);
        } else {
            viewer = viewersDao.getViewerById(identifier);
        }

        if (viewer == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(viewer);
    }

    @PostMapping("/")
    public ResponseEntity<?>
      addViewer(@RequestBody Viewer viewer) {

        boolean hasName = viewer.getName() != null && !viewer.getName().trim().isEmpty();
        boolean hasEmail = viewer.getEmail() != null && !viewer.getEmail().trim().isEmpty();
        boolean hasReason = viewer.getReason() != null && !viewer.getReason().trim().isEmpty();

        if (!hasName && !hasEmail && !hasReason) {
            return ResponseEntity.badRequest()
                .body("At least one of name, email, or reason must be provided");
        }

        Viewer createdViewer = viewersDao.addViewer(viewer);

        URI location = ServletUriComponentsBuilder
          .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(createdViewer.getId())
                .toUri();

        return ResponseEntity.created(location).body(createdViewer);
    }

    @PutMapping("/{identifier}")
    public ResponseEntity<?> updateViewer(
        @PathVariable String identifier,
        @RequestBody Viewer updatedViewer) {

        boolean hasName = updatedViewer.getName() != null && !updatedViewer.getName().trim().isEmpty();
        boolean hasEmail = updatedViewer.getEmail() != null && !updatedViewer.getEmail().trim().isEmpty();
        boolean hasReason = updatedViewer.getReason() != null && !updatedViewer.getReason().trim().isEmpty();

        if (!hasName && !hasEmail && !hasReason) {
            return ResponseEntity.badRequest()
                .body("At least one of name, email, or reason must be provided");
        }

        Viewer viewer = null;

        viewer = viewersDao.getViewerById(identifier);

        if (viewer == null && identifier.contains("@")) {
            viewer = viewersDao.getViewerByEmail(identifier);
        }

        if (viewer == null) {
            return ResponseEntity.notFound().build();
        }

        Viewer updated = viewersDao.updateViewer(viewer.getId(), updatedViewer);

        return ResponseEntity.ok(updated);
    }
}

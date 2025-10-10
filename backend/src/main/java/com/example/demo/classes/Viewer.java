package com.example.demo.classes;

public class Viewer {

    private String id;
    private String name;
    private String email;
    private String reason;

    public Viewer() {}

    public Viewer(String id, String name, String email, String reason) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.reason = reason;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    @Override
    public String toString() {
        return "Viewer [id=" + id + ", name=" + name +
                ", email=" + email +
                ", reason=" + reason + "]";
    }
}

package com.example.moviegameapp.model;

import jakarta.persistence.*;

@Entity
public class MovieGame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String type;   // "Movie" hoặc "Game"
    private String status; // "Đã xem", "Muốn xem", "Đang chơi", v.v.

    public MovieGame() {}

    public MovieGame(String title, String type, String status) {
        this.title = title;
        this.type = type;
        this.status = status;
    }

    // Getters và Setters
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
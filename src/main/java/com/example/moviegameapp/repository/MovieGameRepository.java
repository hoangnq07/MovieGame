package com.example.moviegameapp.repository;

import com.example.moviegameapp.model.MovieGame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MovieGameRepository extends JpaRepository<MovieGame, Long> {}

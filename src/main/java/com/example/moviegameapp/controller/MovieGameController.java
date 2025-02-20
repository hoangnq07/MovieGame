package com.example.moviegameapp.controller;

import com.example.moviegameapp.model.MovieGame;
import com.example.moviegameapp.repository.MovieGameRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/items")
public class MovieGameController {

    private final MovieGameRepository repository;

    public MovieGameController(MovieGameRepository repository) {
        this.repository = repository;
    }

    // GET all movies/games
    @GetMapping
    public List<MovieGame> getAllItems() {
        return repository.findAll();
    }

    // POST new movie/game
    @PostMapping
    public MovieGame addItem(@RequestBody MovieGame item) {
        return repository.save(item);
    }

    // PUT update item
    @PutMapping("/{id}")
    public MovieGame updateItem(@PathVariable Long id, @RequestBody MovieGame updatedItem) {
        return repository.findById(id)
                .map(item -> {
                    item.setTitle(updatedItem.getTitle());
                    item.setType(updatedItem.getType());
                    item.setStatus(updatedItem.getStatus());
                    return repository.save(item);
                })
                .orElseThrow(() -> new RuntimeException("Item không tồn tại"));
    }

    // DELETE item
    @DeleteMapping("/{id}")
    public void deleteItem(@PathVariable Long id) {
        repository.deleteById(id);
    }
}

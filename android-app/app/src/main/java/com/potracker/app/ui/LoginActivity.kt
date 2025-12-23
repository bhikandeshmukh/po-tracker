package com.potracker.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.potracker.app.databinding.ActivityLoginBinding

class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private lateinit var auth: FirebaseAuth

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        auth = FirebaseAuth.getInstance()
        
        // Check if already logged in
        if (auth.currentUser != null) {
            goToMain()
            return
        }
        
        binding.btnLogin.setOnClickListener { login() }
    }
    
    private fun login() {
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()
        
        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
            return
        }
        
        binding.progressBar.visibility = View.VISIBLE
        binding.btnLogin.isEnabled = false
        
        auth.signInWithEmailAndPassword(email, password)
            .addOnSuccessListener {
                goToMain()
            }
            .addOnFailureListener { e ->
                binding.progressBar.visibility = View.GONE
                binding.btnLogin.isEnabled = true
                Toast.makeText(this, "Login failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
    }
    
    private fun goToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}

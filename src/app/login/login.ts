import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {

  email = '';
  password = '';

  constructor(private router: Router) {}

  register() {
    const user = {
      email: this.email,
      password: this.password
    };

    localStorage.setItem('user', JSON.stringify(user));

    alert('Usuario registrado');
  }

  login() {
    const saved = localStorage.getItem('user');

    if (!saved) {
      alert('No hay usuarios registrados');
      return;
    }

    const user = JSON.parse(saved);

    if (user.email === this.email && user.password === this.password) {
      localStorage.setItem('logged', 'true');
      alert('Login correcto');
      this.router.navigate(['/menu']);
    } else {
      alert('Credenciales incorrectas');
    }
  }
}

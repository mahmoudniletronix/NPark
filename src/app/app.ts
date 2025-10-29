import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from "./Feature/header-component/header-component";
import { FooterComponent } from "./Feature/footer-component/footer-component";
import { ToasterHostComponent } from "./Feature/toaster-host-component/toaster-host-component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToasterHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('NPark');
}

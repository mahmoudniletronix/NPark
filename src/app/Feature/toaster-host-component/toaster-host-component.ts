import { Component, ViewChild } from '@angular/core';
import { ToastContainerDirective, ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-toaster-host-component',
  imports: [],
  templateUrl: './toaster-host-component.html',
  styleUrl: './toaster-host-component.css',
})
export class ToasterHostComponent {
  @ViewChild(ToastContainerDirective, { static: true })
  toastContainer!: ToastContainerDirective;

  constructor(private toastr: ToastrService) {}

  ngAfterViewInit(): void {
    this.toastr.overlayContainer = this.toastContainer;
  }
}

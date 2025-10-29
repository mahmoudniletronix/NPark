import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToasterHostComponent } from './toaster-host-component';

describe('ToasterHostComponent', () => {
  let component: ToasterHostComponent;
  let fixture: ComponentFixture<ToasterHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToasterHostComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToasterHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

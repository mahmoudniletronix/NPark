import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExitgateComponent } from './exitgate-component';

describe('ExitgateComponent', () => {
  let component: ExitgateComponent;
  let fixture: ComponentFixture<ExitgateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitgateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExitgateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

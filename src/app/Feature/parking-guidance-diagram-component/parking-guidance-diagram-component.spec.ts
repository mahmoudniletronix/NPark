import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParkingGuidanceDiagramComponent } from './parking-guidance-diagram-component';

describe('ParkingGuidanceDiagramComponent', () => {
  let component: ParkingGuidanceDiagramComponent;
  let fixture: ComponentFixture<ParkingGuidanceDiagramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParkingGuidanceDiagramComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParkingGuidanceDiagramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SwitchlanguageComponent } from './switchlanguage-component';

describe('SwitchlanguageComponent', () => {
  let component: SwitchlanguageComponent;
  let fixture: ComponentFixture<SwitchlanguageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SwitchlanguageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SwitchlanguageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

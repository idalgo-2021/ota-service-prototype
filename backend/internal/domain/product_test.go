package domain

import (
	"errors"
	"testing"
)

func TestProductValidateOrderDate(t *testing.T) {
	scheduled := Product{ProductType: "tour", Schedule: []TourScheduleEntry{{Weekday: 2, Time: "10:00"}, {Weekday: 4, Time: "10:00"}}}
	unscheduled := Product{ProductType: "tour"}
	goods := Product{ProductType: "goods"}
	for _, tc := range []struct {
		name    string
		product Product
		date    *string
		valid   bool
	}{
		{"scheduled date omitted", scheduled, nil, false},
		{"unscheduled date omitted", unscheduled, nil, true},
		{"matching Tuesday", scheduled, datePointer("2026-11-17"), true},
		{"matching Thursday", scheduled, datePointer("2026-11-19"), true},
		{"wrong weekday", scheduled, datePointer("2026-11-18"), false},
		{"unscheduled tour date", unscheduled, datePointer("2026-11-17"), false},
		{"goods date", goods, datePointer("2026-11-17"), false},
		{"invalid date", scheduled, datePointer("2026-11-32"), false},
		{"past date", scheduled, datePointer("2020-11-17"), false},
		{"invalid weekday", Product{ProductType: "tour", Schedule: []TourScheduleEntry{{Weekday: 8, Time: "10:00"}}}, nil, false},
		{"invalid time", Product{ProductType: "tour", Schedule: []TourScheduleEntry{{Weekday: 2, Time: "25:00"}}}, nil, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.product.ValidateOrderDate(tc.date)
			if tc.valid && err != nil || !tc.valid && !errors.Is(err, ErrInvalidInput) {
				t.Fatalf("ValidateOrderDate() = %v, valid = %v", err, tc.valid)
			}
		})
	}
}

func datePointer(value string) *string { return &value }

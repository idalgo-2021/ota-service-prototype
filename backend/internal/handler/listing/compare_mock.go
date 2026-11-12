package listing

import (
	"fmt"
	"hash/fnv"
	"net/http"
	"strings"
	"time"

	"github.com/idalgo-2021/product-catalog-backend/internal/domain"
	handlers "github.com/idalgo-2021/product-catalog-backend/internal/handler"
	"github.com/shopspring/decimal"
)

type ComparisonAdvice struct {
	Focus   string `json:"focus"`
	Likes   string `json:"likes"`
	Missing string `json:"missing"`
	Verdict string `json:"verdict"`
}

type ComparisonHotel struct {
	ListingResponse
	Demo   bool                        `json:"demo"`
	Advice map[string]ComparisonAdvice `json:"advice"`
}

// CompareHotelsMock is a temporary, database-independent comparison endpoint.
// GET /api/v1/hotel/compare?ids=id1,id2 returns the standard {data: ComparisonHotel[]} envelope.
// IDs and their order are preserved; all other fields are explicitly demo data.
// TODO: replace with real comparison data when the service contract is implemented.
func CompareHotelsMock(w http.ResponseWriter, r *http.Request) {
	raw := strings.TrimSpace(r.URL.Query().Get("ids"))
	items := make([]ComparisonHotel, 0)
	if raw == "" {
		handlers.Success(w, http.StatusOK, items)
		return
	}
	ids := strings.Split(raw, ",")
	if len(ids) > 100 {
		handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "ids must contain at most 100 hotel IDs")
		return
	}
	seen := make(map[string]bool, len(ids))
	for _, value := range ids {
		id := strings.TrimSpace(value)
		if id == "" || len(id) > 128 {
			handlers.Error(w, http.StatusBadRequest, "INVALID_INPUT", "hotel IDs must contain 1 to 128 characters")
			return
		}
		if seen[id] {
			continue
		}
		seen[id] = true
		items = append(items, mockComparisonHotel(id))
	}
	handlers.Success(w, http.StatusOK, items)
}

func mockComparisonHotel(id string) ComparisonHotel {
	hash := fnv.New32a()
	_, _ = hash.Write([]byte(id))
	seed := int64(hash.Sum32())
	names := []string{"У парка", "Набережная", "Тихий двор", "Панорама"}
	description := "Демонстрационные данные для проверки сравнения отелей."
	address := fmt.Sprintf("Тестовая улица, %d", seed%90+1)
	timestamp := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)
	hotel := ListingResponse{
		ID:            id,
		Title:         fmt.Sprintf("Демо-отель «%s»", names[seed%int64(len(names))]),
		Description:   &description,
		Address:       &address,
		ListingTypeID: 1,
		LocationID:    1,
		IsActive:      true,
		CheckInTime:   fmt.Sprintf("%02d:00:00", 12+seed%4),
		CreatedAt:     timestamp,
		UpdatedAt:     timestamp,
		StartingPrice: &domain.StartingPrice{Amount: decimal.NewFromInt(3000 + seed%15*500), Currency: "RUB", UnitType: "room"},
	}
	return ComparisonHotel{ListingResponse: hotel, Demo: true, Advice: mockComparisonAdvice(seed % 4)}
}

func mockComparisonAdvice(index int64) map[string]ComparisonAdvice {
	ru := []ComparisonAdvice{
		{"Чтобы выспаться", "Окна выходят в парк, а завтрак подают до 11:00 — можно проснуться без будильника и спокойно начать день.", "До центра не дойти за пару минут: на дорогу придётся заложить около получаса. Кафе рядом немного.", "Подойдёт, если тишина и неспешное утро важнее жизни в центре."},
		{"Чтобы везде ходить пешком", "Набережная и основные достопримечательности рядом. По дороге легко найти кофейню и спонтанно поменять маршрут.", "Нет тихого двора: вечером под окнами оживлённо. Завтрак в отеле не подают.", "Подойдёт, если хочется проводить день в городе, а завтракать каждый раз в новом месте."},
		{"Чтобы отдыхать без суеты", "Тихий внутренний двор и небольшая кухня в номере: можно приготовить привычный завтрак и не зависеть от расписания.", "Нет готового завтрака и ежедневной уборки. До мест для прогулок нужно ехать на транспорте.", "Подойдёт, если важны спокойствие и домашний распорядок, а сервис второстепенен."},
		{"Ради красивого утра", "Завтрак на террасе с видом на город и просторный номер — приятно задержаться в отеле перед прогулкой.", "Нет удобного пешего маршрута до центра: отель на холме. Для тишины придётся закрывать окна со стороны дороги.", "Подойдёт, если вид и завтрак важнее расположения и абсолютной тишины."},
	}
	en := []ComparisonAdvice{
		{"For a good night's sleep", "Windows face the park and breakfast runs until 11 am, leaving time for a slow morning.", "The centre is about half an hour away, with few cafés nearby.", "Choose this if quiet nights and relaxed mornings matter more than a central location."},
		{"For exploring on foot", "The waterfront and main sights are close, with cafés along the way for spontaneous stops.", "There is no quiet courtyard: the street stays lively in the evening. Breakfast is not served.", "Choose this if you plan to spend your days out and try a different breakfast spot each morning."},
		{"For a slower pace", "A quiet courtyard and an in-room kitchen let you make your usual breakfast on your own schedule.", "There is no prepared breakfast or daily housekeeping. Walking areas require a transit ride.", "Choose this if quiet and a familiar routine matter more than hotel service."},
		{"For mornings with a view", "Breakfast on a terrace overlooking the city and a spacious room make it tempting to linger.", "There is no easy walk to the centre from this hilltop location. Road-facing windows need to stay closed for quiet.", "Choose this if views and breakfast matter more than location and complete silence."},
	}
	return map[string]ComparisonAdvice{"ru": ru[index], "en": en[index]}
}

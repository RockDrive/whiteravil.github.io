import Choices from 'choices.js';
export default function() {

    let timerProgress,
        timer,
        minuteBlock,
        secondBlock,
        timeDefault,
        time = timeDefault,
        timeHour,
        timeMinute,
        timeSecond,
        timerInterval;

    function timerCounter() {
        if ( time > 0 ) {
            time--;
            timeHour = parseInt(time / 60 / 60);
            timeMinute = parseInt( ( time - ( timeHour * 60 * 60 ) ) / 60 );
            timeSecond = time - ( timeHour * 60 * 60 ) - ( timeMinute * 60 );
            minuteBlock.innerText = timeMinute;
            timeSecond.toString().length < 2 ? secondBlock.innerText = '0' + timeSecond : secondBlock.innerText = timeSecond;
            timerProgress.style.width = `${( timeDefault - time ) / timeDefault * 100}%`
        }
        else {
            initTimer();
            openModal('#exc-rate-change')
        }
    };

    function initTimer() {
        timerProgress = document.querySelector('.actual-course-progressbar span');
        timer = document.querySelector('.timer');
        minuteBlock = timer.querySelector('.minutes');
        secondBlock = timer.querySelector('.seconds');
        timeDefault = parseInt(timer.getAttribute('data-time'));
        time = timeDefault;
        timeHour = 0;
        timeMinute = 0;
        timeSecond = 0;
        clearInterval(timerInterval);
        timerCounter();
        timerInterval = setInterval(timerCounter, 1000);
    };

    if ( document.querySelector('.timer') ) {
        initTimer()
    }

    $(document).on('click', '.selected-location', function() {
        let ths = $(document).find('.select-location-group');
        ths.toggleClass('opened');
    });

    $(document).on('click', '.select-location-item', function() {
        let ths = $(document).find('.select-location-group');
        ths.find('.select-location-item').removeClass('active');
        $(this).addClass('active');
        ths.find('.selected-location').removeClass('muted').text($(this).find('.select-location-item-main').text());
        ths.removeClass('opened')
    });

    $(document).on('click', function(e) {
        if ( !$(e.target).closest('.select-location-group').length ) {
            $('.select-location-group').removeClass('opened')
        }
    });

    function officesMapInit() {

        let citiesArr;
        let departmentsArr;

        let citiesProm = new Promise(resolve => {
            $.ajax({
                type: 'get',
                url: `/api/city`,
                dataType: 'json',
                success: function (res) {
                    citiesArr = res;
                    resolve();
                }
            });
        });

        let departmentsProm = new Promise(resolve => {
            $.ajax({
                type: 'get',
                url: `/api/departments/all`,
                dataType: 'json',
                success: function (res) {
                    departmentsArr = res;
                    resolve();
                }
            });
        });

        Promise.all([citiesProm, departmentsProm]).then(res => {
            officesMapInitSuccess(departmentsArr);
        })

    }

    function officesMapInitSuccess(departmentsArr) {

        let officesMap = new ymaps.Map('offices-map', {
            center: [55.796554, 49.104752],
            zoom: 12,
            controls: []
        });

        let officesList = [];

        for ( let key in departmentsArr ) {

            let departmentsArrItem = departmentsArr[key];

            officesList.push({
                id: departmentsArrItem.id,
                coords: [departmentsArrItem.geolocation.lat, departmentsArrItem.geolocation.lng],
                content: [
                    '<div class="offices__balloon-inner">',
                    '<button type="button" class="offices__balloon-close">',
                    '<svg width="20" height="20" aria-hidden="true" class="icon-cross"><use xlink:href="#cross"/></svg>',
                    '</button>',
                    '<div class="offices__balloon-inner-row">',
                    '<h5>Адрес</h5>',
                    `<p><strong>${departmentsArrItem.address}</strong></p>`,
                    `<p>${departmentsArrItem.addrdesc}</p>`,
                    '</div>',
                    '<div class="offices__balloon-inner-row">',
                    '<h5>Время работы</h5>',
                    '<table>',
                    '<tr>',
                    `<th><strong>${departmentsArrItem.schedule[0].title}</strong></th>`,
                    `<td>${departmentsArrItem.schedule[0].times}</td>`,
                    '</tr>',
                    '<tr>',
                    `<th><strong>${departmentsArrItem.schedule[1].title}</strong></th>`,
                    `<td>${departmentsArrItem.schedule[1].times}</td>`,
                    '</tr>',
                    '</table>',
                    '</div>',
                    '<div class="offices__balloon-select">',
                    `<button type="button" class="offices__balloon-select-btn" data-id="${departmentsArrItem.id}">Выбрать</button>`,
                    '</div>',
                    '</div>'
                ].join('')
            });

        }

        let objectManagerList = new ymaps.ObjectManager({
            clusterize: false,
            gridSize: 128,
            clusterIconLayout: 'default#pieChart',
            clusterHasBalloon: false,
            geoObjectOpenBalloonOnClick: false
        });
        officesMap.geoObjects.add(objectManagerList);

        officesList.forEach(item => {

            let mapAddOBJ = {
                id: item.coords.join('-'),
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: item.coords
                },
                options: _objectSpread({}, {
                    iconLayout: 'default#image',
                    iconImageHref: 'img/map-pins/office.svg',
                    iconImageSize: window.matchMedia('(min-width: 769px)').matches ? [25, 37] : [25, 37],
                    iconImageOffset: window.matchMedia('(min-width: 769px)').matches ? [-12.5, -37] : [-25, -74]
                }),
                properties: {
                    id: item.id,
                    balloonContent: item.content
                }
            };

            objectManagerList.add(mapAddOBJ);

        });

        let balloonContainerMain = $('.offices-map-ballon');

        let prevObject = false;

        objectManagerList.objects.events.add('click', function(e) {
            let objectId = e.get('objectId');
            let baloonContent = objectManagerList.objects.getById(objectId).properties.balloonContent;

            if (baloonContent) {
                balloonContainerMain.html(baloonContent);
                let button = balloonContainerMain.find('.offices__balloon-close');
                button.on('click', function(event) {
                    event.preventDefault();
                    balloonContainerMain.html('');
                });
                balloonContainerMain.find('.offices__balloon-select-btn').on('click', function(a) {
                    a.preventDefault();
                    let thsId = $(this).data('id');
                    let selectLocGroup = $(document).find('.select-location-group');
                    selectLocGroup.find('.select-location-item').removeClass('active');
                    $(document).find(`.select-location-item[data-id=${thsId}]`).addClass('active');
                    selectLocGroup.find('.selected-location').removeClass('muted').text($(document).find(`.select-location-item[data-id=${thsId}]`).find('.select-location-item-main').text());
                    selectLocGroup.removeClass('opened');

                    objectManagerList.objects.each(function(item) {
                        objectManagerList.objects.setObjectOptions(item.id, {
                            iconImageHref: 'img/map-pins/office.svg'
                        })
                    });
                    objectManagerList.objects.setObjectOptions(e.get('objectId'), {
                        iconImageHref: 'img/map-pins/office-active.svg'
                    });
                    prevObject = e.get('objectId');
                    balloonContainerMain.html('');
                    let currLoc = objectId.split('-');
                    officesMap.panTo([parseFloat(objectId.split('-')[0]), parseFloat(objectId.split('-')[1])]);
                    eventDev(thsId);
                });
            }
        });

        $(document).on('click', '.select-location-item', function() {
            let thsId = $(this).data('id');

            objectManagerList.objects.each(function(item) {
                let coord = item.id.split('-');
                console.log(coord)
                if ( item.properties.id === parseInt(thsId) ) {
                    objectManagerList.objects.setObjectOptions(item.id, {
                        iconImageHref: 'img/map-pins/office-active.svg'
                    });
                    officesMap.panTo([parseFloat(coord[0]), parseFloat(coord[1])]);
                }
                else {
                    objectManagerList.objects.setObjectOptions(item.id, {
                        iconImageHref: 'img/map-pins/office.svg'
                    })
                }
            });

            eventDev(thsId);

        });

    }

    ymaps.ready(officesMapInit);

    $('.open-map').on('click', function(e) {
        e.preventDefault();
        $('.map-slide-container').slideToggle(400)
    });

    let baseValuteCoef = {},
        currCoef = 1;

    function getBaseValuteCoef(base) {
        if ( typeof valuteJSON != 'undefined' ) {
            valuteJSON.forEach(arr => {
                if ( arr.base === base ) {
                    baseValuteCoef = arr.coef
                }
            });
            let currToValute = $('.curexc-valute-type-to').val();
            currCoef = baseValuteCoef[currToValute];
        }
    }

    $('.curexc-valute-type-from').on('change', function() {
        let thsVal = $(this).val();
        getBaseValuteCoef(thsVal);
        setTimeout(() => {
            $('.curexc-value-from').trigger('change');
            eventCurrency(thsVal)
        }, 10)
    });

    // $('.curexc-valute-type-to').on('change', function() {
    //     let thsVal = $(this).val();
    //     currCoef = baseValuteCoef[thsVal];
    //     setTimeout(() => {
    //         $('.curexc-value-from').trigger('change')
    //         eventCurrency(thsVal)
    //     }, 10)
    // });

    $('.curexc-value-from').on('change', function() {
        setTimeout(() => {
            let currVal = (parseFloat($(this).val()) * currCoef).toFixed(0);
            $('.curexc-value-to + .range-slider__element-wrapper .range-slider__amount').val(currVal);
            // $('.curexc-value-to + .range-slider__element-wrapper .range-slider__element')[0].noUiSlider.setHandle(null, currVal)
        }, 10)
    });

    $('.curexc-value-to').on('change', function() {
        let thisVal = parseFloat($(this).val());
        $('.curexc-value-from + .range-slider__element-wrapper .range-slider__amount').val((thisVal / currCoef).toFixed(0))
    });

    $('.curexc-next').on('click', function(e) {
        e.preventDefault();
        let act = $('.application__form-steps-layer.active'),
            step = parseInt(act.data('step'));
        if ( $(this).hasClass('check-phone') ) {
            openModal('#application-code-2')
        }
        else {
            nextStep(step + 1);
        }
    });

    $('.curexc-prev').on('click', function(e) {
        e.preventDefault();
        let act = $('.application__form-steps-layer.active'),
            step = parseInt(act.data('step'));
        if ( step != 1  ) {
            nextStep(step - 1)
        }
    })

    $('.curexc-first-step').on('click', function(e) {
        nextStep(1);
    })

    function nextStep(i) {
        $('.curexc-steps-nav .application__steps-new-list-item').each(function(a) {
            if ( a < i - 1 ) {
                $(this).addClass('mute').removeClass('active')
            }
            else if ( a == i - 1 ) {
                $(this).removeClass('mute').addClass('active');
            }
            else {
                $(this).removeClass('mute').removeClass('active');
            }
        });
        $('.application__form-steps-layer').removeClass('active');
        $(`.application__form-steps-layer[data-step="${i}"]`).addClass('active');
        if ( i == 1 ) {
            $('.curexc-total').removeClass('active');
            $('.curexc-footer-checkboxes').removeClass('active');
            $('.curexc-prev').removeClass('active');
            $('.curexc-first-step').removeClass('active');
            $('.curexc-right').show();
            $('.curexc-to-main').removeClass('active');
            $('.curexc-next').removeClass('hide').removeClass('check-phone');
            $('.curexc-form').css('--progress', '33.33333%');
        }
        else if ( i == 2 ) {
            $('.curexc-total').addClass('active');
            $('.curexc-footer-checkboxes').addClass('active');
            $('.curexc-prev').addClass('active');
            $('.curexc-first-step').removeClass('active');
            $('.curexc-right').show();
            $('.curexc-to-main').removeClass('active');
            $('.curexc-next').removeClass('hide').addClass('check-phone');
            $('.curexc-form').css('--progress', '66.66666%');
        }
        else if ( i == 3 ) {
            $('.curexc-total').addClass('active');
            $('.curexc-footer-checkboxes').removeClass('active');
            $('.curexc-prev').removeClass('active');
            $('.curexc-first-step').addClass('active');
            $('.curexc-right').hide();
            $('.curexc-to-main').addClass('active');
            $('.curexc-next').addClass('hide').removeClass('check-phone');
            $('.curexc-form').css('--progress', '100%');
            setTimeout(() => {
                openModal('#reminder')
            }, 1000)
        }
    }

    $('.js-curexc-next-step').on('click', function(e) {
        e.preventDefault();
        nextStep(3);
    });

    $('.curexc-cards .advantages__card').on('click', function(e) {
        e.preventDefault();
        if ( $(window).width() < 768 ) {
            let thsContent = $(this).html();
            $('.curexc-adv-info').html(thsContent);
            openModal('#mob-curexc-adv');
        }
        else {
            $('html, body').animate({
                scrollTop: $('.s-curexc-info').offset().top - 30
            });
            $('.curexc-info-nav').find('.js-tabs-nav:nth-child(2)')[0].click();
        }

    });

    $('.curexc-footer-btns button, .curexc-footer-btns a').on('click', function() {
        $('html, body').animate({
            scrollTop: $('.s-curexс').offset().top
        }, 600)
    });

    $('.js-select-city').on('change', function() {
        let thsId = $(this).val();
        eventCity(thsId)
    });

    $('input[name=operations-type]').on('change', function() {
        let currVal = $('input[name=operations-type]:checked').val();
        eventTypeOrder(currVal);
        if ( currVal == '1' ) {
            $('.curexc-buy-sell-group').addClass('rotate')
        }
        else {
            $('.curexc-buy-sell-group').removeClass('rotate')
        }
    });


    // ------------------

    var cities,
        departments,
        selectCity,
        selectCur,
        CurrentCityID,
        CurrentDepID,
        CurrentCurrency,
        CurrentCurrencySum,
        CurrentOrderType;

    function initSelect(selector) {
        return new Choices(document.querySelector(selector), {
            searchEnabled: false,
            itemSelectText: '',
            shouldSort: false
        });
    }

    function updateSelect(ChoicesObj, array) {
        let selector = ChoicesObj.passedElement.element;
        ChoicesObj.destroy();
        selector.innerHTML = SelectGeneration(array);
        return new Choices(selector, {
            searchEnabled: false,
            itemSelectText: '',
            shouldSort: false
        });
    }

    function selectGetDev() {
        $('.select-location-drop').html('');
        for ( let key in departments ) {
            let departmentsArrItem = departments[key];
            $('.select-location-drop').append([
                `<div class="select-location-item selected" data-id="${departmentsArrItem.id}">`,
                `<div class="select-location-item-main">${departmentsArrItem.address}</div>`,
                `<div class="select-location-item-second">${departmentsArrItem.addrdesc}</div>`,
                '<div class="select-location-item-icon">',
                '<div class="show-more-info">',
                '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">',
                '<path d="M10 0C4.486 0 0 4.486 0 10C0 15.514 4.486 20 10 20C15.514 20 20 15.514 20 10C20 4.486 15.514 0 10 0ZM10 18C5.589 18 2 14.411 2 10C2 5.589 5.589 2 10 2C14.411 2 18 5.589 18 10C18 14.411 14.411 18 10 18Z" fill="#D9D9D9"/>',
                '<path d="M11 5H9V10.414L12.293 13.707L13.707 12.293L11 9.586V5Z" fill="#D9D9D9"/>',
                '</svg>',
                '<div class="show-more-info__dropdown">',
                '<div class="show-more-info__dropdown-inner">',
                '<p>',
                `Время работы:<br>${departmentsArrItem.schedule[0].title} - ${departmentsArrItem.schedule[0].times}<br>${departmentsArrItem.schedule[1].title} - ${departmentsArrItem.schedule[1].times}`,
                '</p>',
                '</div>',
                '</div>',
                '</div>',
                '</div>',
                '</div>'
            ].join(''));
        }
    }

    // получить список городов
    function getCityList() {
        $.ajax({
            type: 'get',
            url: `/api/city`,
            dataType: 'json',
            success: function (res) {
                cities = res;
                selectCity = updateSelect(selectCity, cities);
                eventCity(Object.keys(cities)[0]);
                /*
                    - перерасчет курса (input внизу)
                    - изменение курса справа
                    - обновления счетчика "Актуальный курс"
                */
            }
        });
    }

    // получить город
    function getCityDetail(id) {
        $.ajax({
            type: 'get',
            url: `/api/city/${id}`,
            dataType: 'json',
            success: function (res) {
                cities[id] = res;
            }
        });
    }

    // получить список всех подразделений
    function getDepListAll() {
        $.ajax({
            type: 'get',
            url: `/api/departments/all`,
            dataType: 'json',
            success: function (res) {
                departments = res;
            }
        });
    }

    // получить список подразделений города
    function getDepList(cityId) {
        $.ajax({
            type: 'get',
            url: `/api/${cityId}/departments`,
            dataType: 'json',
            success: function (res) {
                departments = res;
                selectGetDev(cityId);
            }
        });
    }

    // получить подразделение
    function getDepDetail(id) {
        $.ajax({
            type: 'get',
            url: `/department/${id}`,
            dataType: 'json',
            success: function (res) {
                departments[id] = res;
            }
        });
    }

    // служебная информация
    function getServInfo(depid, count, type) {
        $.ajax({
            type: 'post',
            url: `/api/servinfo`,
            data: {depid: depid, count: count, type: type},
            dataType: 'json',
            success: function (res) {
                console.log(res);
            }
        });
    }

    // Отправка телефона
    function sendPhone(phone) {
        $.ajax({
            type: 'post',
            url: `/api/sms`,
            data: {phone: phone},
            dataType: 'json',
            success: function (res) {
                console.log(res);
            }
        });
    }

    // Проверка смс кода
    function sendSmsCode(operation, code) {
        $.ajax({
            type: 'put',
            url: `/api/sms/${operation}`,
            data: {code: code},
            dataType: 'json',
            success: function (res) {
                console.log(res);
            }
        });
    }
    // sendSmsCode("ef08ffa3f920a4e3374409e6b70ae4b3", "1288");

    // СОБЫТИЯ
    // выбор города
    function eventCity(id) {
        CurrentCityID = id;

        // вывод подразделений
        getDepList(CurrentCityID);
        
        // обновление/вывод валют и курсов
        let baseValute = $('.curexc-valute-type-from').val(),
            exchange = cities[id].exchange;
        selectCur = updateSelect(selectCur, exchange);
        eventCurrency(Object.keys(exchange)[0]);
        valuteJSON = [
            {
                base: 'USD',
                coef: {
                    RUB: 74.79,
                    USD: 1,
                    EUR: 0.83,
                }
            },
            {
                base: 'EUR',
                coef: {
                    RUB: 90.57,
                    USD: 1.21,
                    EUR: 1,
                }
            },
        ];
        getBaseValuteCoef(baseValute);
    }
    // выбор подразделения
    function eventDev(id) {
        CurrentDepID = id;
    }
    // изменение валюты
    function eventCurrency(code) {
        CurrentCurrency = code;
    }
    // изменение суммы
    function eventCurrencySum(sum) {
        CurrentCurrencySum = sum;
    }
    // выбор Покупка/Продажа
    function eventTypeOrder(type) {
        CurrentOrderType = type;
    }

    // генерация option
    function SelectGeneration(getList = []) {
        let opts = "";
        for( let id in  getList) {
            opts += '<option value="' + id + '">' + getList[id]["name"] + '</option>';
        }
        return opts;
    }




    // инициализация select
    selectCity = initSelect('.js-select-city');
    selectCur = initSelect('.js-select-currency');

    // подгрузка городов
    getCityList();

}

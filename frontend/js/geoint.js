// ==========================================================================
// ARGUS // Tactical Intelligence & Defense Cockpit
// 3D HIGH-FIDELITY WIREFRAME GLOBE & C4ISR TELEMETRY ENGINE
// Realistic Earth Mesh, Geodesic Triangulation, Ballistic Arcs & Satellites
// Energy-Efficient Canvas Architecture (Strict 30 FPS, 0% CPU Idle)
// ==========================================================================
(function () {
  'use strict';

  function getIpcToken() {
    if (window.__ARGUS_IPC_TOKEN__) return window.__ARGUS_IPC_TOKEN__;
    if (window.argusNative && typeof window.argusNative.getIpcToken === 'function') {
      try {
        const token = window.argusNative.getIpcToken();
        if (token) {
          window.__ARGUS_IPC_TOKEN__ = token;
          return token;
        }
      } catch (_) {}
    }
    try {
      const stored = localStorage.getItem('argus_ipc_token');
      if (stored) {
        window.__ARGUS_IPC_TOKEN__ = stored;
        return stored;
      }
    } catch (_) {}
    return '';
  }

  // High-fidelity world mesh data (10 realistic continental contours + 589 triangulated edges)
  const WORLD_MESH_DATA = {"coastlines": {"north_america": [[72, -156], [71, -140], [69, -135], [68, -120], [65, -100], [60, -90], [62, -80], [62, -65], [55, -60], [50, -56], [47, -53], [44, -64], [42, -70], [37, -76], [32, -80], [25, -80], [25, -82], [29, -84], [30, -88], [28, -96], [22, -97], [19, -96], [16, -93], [15, -88], [13, -87], [9, -83], [8, -77], [7, -81], [10, -85], [14, -92], [16, -98], [20, -105], [25, -110], [32, -117], [37, -122], [42, -124], [48, -125], [54, -130], [58, -136], [60, -145], [58, -155], [60, -165], [66, -168], [70, -162], [72, -156]], "south_america": [[12, -72], [10, -62], [6, -58], [5, -52], [0, -50], [-3, -40], [-6, -35], [-12, -37], [-18, -39], [-23, -43], [-28, -48], [-34, -53], [-38, -57], [-45, -65], [-52, -68], [-55, -66], [-54, -72], [-48, -75], [-40, -74], [-33, -72], [-23, -70], [-16, -75], [-10, -78], [-5, -81], [2, -79], [8, -77], [12, -72]], "europe": [[71, 26], [68, 15], [62, 5], [58, 6], [54, 9], [53, 5], [51, 2], [48, -4], [44, -1], [43, -8], [37, -9], [36, -6], [37, -2], [41, 1], [43, 4], [44, 9], [41, 15], [38, 15], [40, 18], [40, 24], [37, 23], [39, 26], [41, 29], [44, 29], [46, 31], [47, 39], [45, 37], [44, 34], [47, 30], [54, 20], [56, 13], [59, 11], [60, 19], [65, 23], [70, 28], [71, 26]], "british_isles": [[58, -5], [58, -2], [54, 0], [51, 1], [50, -5], [53, -5], [55, -6], [58, -5]], "africa": [[36, -5], [37, 10], [33, 11], [32, 20], [31, 32], [28, 34], [22, 37], [12, 44], [12, 51], [5, 48], [-2, 41], [-11, 40], [-25, 33], [-34, 26], [-34, 18], [-28, 16], [-22, 14], [-15, 12], [-5, 12], [4, 9], [5, 0], [5, -7], [8, -13], [12, -16], [16, -16], [22, -17], [28, -13], [33, -9], [36, -5]], "madagascar": [[-12, 49], [-16, 50], [-25, 47], [-25, 44], [-17, 44], [-12, 49]], "asia_eurasia": [[77, 105], [73, 80], [70, 60], [68, 50], [60, 40], [50, 40], [45, 47], [40, 50], [37, 50], [30, 48], [25, 55], [24, 60], [25, 67], [20, 70], [10, 76], [8, 77], [13, 80], [18, 83], [22, 89], [22, 92], [16, 94], [10, 99], [5, 103], [1, 104], [6, 108], [11, 109], [20, 107], [22, 114], [25, 119], [31, 122], [38, 118], [40, 124], [35, 129], [38, 129], [42, 131], [48, 135], [55, 137], [60, 145], [58, 160], [65, 170], [66, 179], [70, 178], [72, 150], [75, 135], [77, 105]], "japan": [[45, 142], [43, 145], [35, 140], [33, 131], [34, 133], [38, 139], [41, 141], [45, 142]], "australia": [[-12, 132], [-12, 136], [-17, 139], [-12, 142], [-18, 146], [-25, 153], [-33, 152], [-38, 146], [-38, 140], [-35, 136], [-32, 132], [-32, 125], [-35, 117], [-32, 115], [-25, 113], [-20, 118], [-16, 123], [-15, 129], [-12, 132]], "greenland": [[82, -30], [76, -20], [70, -25], [60, -44], [65, -52], [72, -56], [78, -68], [82, -50], [82, -30]]}, "edges": [[[72, -156], [71, -140]], [[71, -140], [69, -135]], [[69, -135], [68, -120]], [[68, -120], [65, -100]], [[65, -100], [60, -90]], [[60, -90], [62, -80]], [[62, -80], [62, -65]], [[62, -65], [55, -60]], [[55, -60], [50, -56]], [[50, -56], [47, -53]], [[47, -53], [44, -64]], [[44, -64], [42, -70]], [[42, -70], [37, -76]], [[37, -76], [32, -80]], [[32, -80], [25, -80]], [[25, -80], [25, -82]], [[25, -82], [29, -84]], [[29, -84], [30, -88]], [[30, -88], [28, -96]], [[28, -96], [22, -97]], [[22, -97], [19, -96]], [[19, -96], [16, -93]], [[16, -93], [15, -88]], [[15, -88], [13, -87]], [[13, -87], [9, -83]], [[9, -83], [8, -77]], [[8, -77], [7, -81]], [[7, -81], [10, -85]], [[10, -85], [14, -92]], [[14, -92], [16, -98]], [[16, -98], [20, -105]], [[20, -105], [25, -110]], [[25, -110], [32, -117]], [[32, -117], [37, -122]], [[37, -122], [42, -124]], [[42, -124], [48, -125]], [[48, -125], [54, -130]], [[54, -130], [58, -136]], [[58, -136], [60, -145]], [[60, -145], [58, -155]], [[58, -155], [60, -165]], [[60, -165], [66, -168]], [[66, -168], [70, -162]], [[70, -162], [72, -156]], [[72, -156], [72, -156]], [[72, -156], [69, -135]], [[69, -135], [65, -100]], [[65, -100], [62, -80]], [[62, -80], [55, -60]], [[55, -60], [47, -53]], [[47, -53], [42, -70]], [[42, -70], [32, -80]], [[32, -80], [25, -82]], [[25, -82], [30, -88]], [[30, -88], [22, -97]], [[22, -97], [16, -93]], [[16, -93], [13, -87]], [[13, -87], [8, -77]], [[8, -77], [10, -85]], [[10, -85], [16, -98]], [[16, -98], [25, -110]], [[25, -110], [37, -122]], [[37, -122], [48, -125]], [[48, -125], [58, -136]], [[58, -136], [58, -155]], [[58, -155], [66, -168]], [[66, -168], [72, -156]], [[72, -156], [71, -140]], [[72, -156], [68, -120]], [[69, -135], [60, -90]], [[65, -100], [62, -65]], [[62, -80], [50, -56]], [[55, -60], [44, -64]], [[47, -53], [37, -76]], [[42, -70], [25, -80]], [[32, -80], [29, -84]], [[25, -82], [28, -96]], [[30, -88], [19, -96]], [[22, -97], [15, -88]], [[16, -93], [9, -83]], [[13, -87], [7, -81]], [[8, -77], [14, -92]], [[10, -85], [20, -105]], [[16, -98], [32, -117]], [[25, -110], [42, -124]], [[37, -122], [54, -130]], [[48, -125], [60, -145]], [[58, -136], [60, -165]], [[58, -155], [70, -162]], [[66, -168], [72, -156]], [[72, -156], [69, -135]], [[72, -156], [60, -90]], [[69, -135], [62, -65]], [[65, -100], [50, -56]], [[62, -80], [44, -64]], [[55, -60], [37, -76]], [[47, -53], [25, -80]], [[42, -70], [29, -84]], [[32, -80], [28, -96]], [[25, -82], [19, -96]], [[30, -88], [15, -88]], [[22, -97], [9, -83]], [[16, -93], [7, -81]], [[13, -87], [14, -92]], [[8, -77], [20, -105]], [[10, -85], [32, -117]], [[16, -98], [42, -124]], [[25, -110], [54, -130]], [[37, -122], [60, -145]], [[48, -125], [60, -165]], [[58, -136], [70, -162]], [[58, -155], [72, -156]], [[66, -168], [69, -135]], [[72, -156], [65, -100]], [[12, -72], [10, -62]], [[10, -62], [6, -58]], [[6, -58], [5, -52]], [[5, -52], [0, -50]], [[0, -50], [-3, -40]], [[-3, -40], [-6, -35]], [[-6, -35], [-12, -37]], [[-12, -37], [-18, -39]], [[-18, -39], [-23, -43]], [[-23, -43], [-28, -48]], [[-28, -48], [-34, -53]], [[-34, -53], [-38, -57]], [[-38, -57], [-45, -65]], [[-45, -65], [-52, -68]], [[-52, -68], [-55, -66]], [[-55, -66], [-54, -72]], [[-54, -72], [-48, -75]], [[-48, -75], [-40, -74]], [[-40, -74], [-33, -72]], [[-33, -72], [-23, -70]], [[-23, -70], [-16, -75]], [[-16, -75], [-10, -78]], [[-10, -78], [-5, -81]], [[-5, -81], [2, -79]], [[2, -79], [8, -77]], [[8, -77], [12, -72]], [[12, -72], [12, -72]], [[12, -72], [6, -58]], [[6, -58], [0, -50]], [[0, -50], [-6, -35]], [[-6, -35], [-18, -39]], [[-18, -39], [-28, -48]], [[-28, -48], [-38, -57]], [[-38, -57], [-52, -68]], [[-52, -68], [-54, -72]], [[-54, -72], [-40, -74]], [[-40, -74], [-23, -70]], [[-23, -70], [-10, -78]], [[-10, -78], [2, -79]], [[2, -79], [12, -72]], [[12, -72], [10, -62]], [[12, -72], [5, -52]], [[6, -58], [-3, -40]], [[0, -50], [-12, -37]], [[-6, -35], [-23, -43]], [[-18, -39], [-34, -53]], [[-28, -48], [-45, -65]], [[-38, -57], [-55, -66]], [[-52, -68], [-48, -75]], [[-54, -72], [-33, -72]], [[-40, -74], [-16, -75]], [[-23, -70], [-5, -81]], [[-10, -78], [8, -77]], [[2, -79], [12, -72]], [[12, -72], [6, -58]], [[12, -72], [-3, -40]], [[6, -58], [-12, -37]], [[0, -50], [-23, -43]], [[-6, -35], [-34, -53]], [[-18, -39], [-45, -65]], [[-28, -48], [-55, -66]], [[-38, -57], [-48, -75]], [[-52, -68], [-33, -72]], [[-54, -72], [-16, -75]], [[-40, -74], [-5, -81]], [[-23, -70], [8, -77]], [[-10, -78], [12, -72]], [[2, -79], [6, -58]], [[12, -72], [0, -50]], [[71, 26], [68, 15]], [[68, 15], [62, 5]], [[62, 5], [58, 6]], [[58, 6], [54, 9]], [[54, 9], [53, 5]], [[53, 5], [51, 2]], [[51, 2], [48, -4]], [[48, -4], [44, -1]], [[44, -1], [43, -8]], [[43, -8], [37, -9]], [[37, -9], [36, -6]], [[36, -6], [37, -2]], [[37, -2], [41, 1]], [[41, 1], [43, 4]], [[43, 4], [44, 9]], [[44, 9], [41, 15]], [[41, 15], [38, 15]], [[38, 15], [40, 18]], [[40, 18], [40, 24]], [[40, 24], [37, 23]], [[37, 23], [39, 26]], [[39, 26], [41, 29]], [[41, 29], [44, 29]], [[44, 29], [46, 31]], [[46, 31], [47, 39]], [[47, 39], [45, 37]], [[45, 37], [44, 34]], [[44, 34], [47, 30]], [[47, 30], [54, 20]], [[54, 20], [56, 13]], [[56, 13], [59, 11]], [[59, 11], [60, 19]], [[60, 19], [65, 23]], [[65, 23], [70, 28]], [[70, 28], [71, 26]], [[71, 26], [71, 26]], [[71, 26], [62, 5]], [[62, 5], [54, 9]], [[54, 9], [51, 2]], [[51, 2], [44, -1]], [[44, -1], [37, -9]], [[37, -9], [37, -2]], [[37, -2], [43, 4]], [[43, 4], [41, 15]], [[41, 15], [40, 18]], [[40, 18], [37, 23]], [[37, 23], [41, 29]], [[41, 29], [46, 31]], [[46, 31], [45, 37]], [[45, 37], [47, 30]], [[47, 30], [56, 13]], [[56, 13], [60, 19]], [[60, 19], [70, 28]], [[70, 28], [71, 26]], [[71, 26], [58, 6]], [[62, 5], [53, 5]], [[54, 9], [48, -4]], [[51, 2], [43, -8]], [[44, -1], [36, -6]], [[37, -9], [41, 1]], [[37, -2], [44, 9]], [[43, 4], [38, 15]], [[41, 15], [40, 24]], [[40, 18], [39, 26]], [[37, 23], [44, 29]], [[41, 29], [47, 39]], [[46, 31], [44, 34]], [[45, 37], [54, 20]], [[47, 30], [59, 11]], [[56, 13], [65, 23]], [[60, 19], [71, 26]], [[70, 28], [68, 15]], [[71, 26], [53, 5]], [[62, 5], [48, -4]], [[54, 9], [43, -8]], [[51, 2], [36, -6]], [[44, -1], [41, 1]], [[37, -9], [44, 9]], [[37, -2], [38, 15]], [[43, 4], [40, 24]], [[41, 15], [39, 26]], [[40, 18], [44, 29]], [[37, 23], [47, 39]], [[41, 29], [44, 34]], [[46, 31], [54, 20]], [[45, 37], [59, 11]], [[47, 30], [65, 23]], [[56, 13], [71, 26]], [[60, 19], [68, 15]], [[70, 28], [58, 6]], [[58, -5], [58, -2]], [[58, -2], [54, 0]], [[54, 0], [51, 1]], [[51, 1], [50, -5]], [[50, -5], [53, -5]], [[53, -5], [55, -6]], [[55, -6], [58, -5]], [[58, -5], [58, -5]], [[58, -5], [54, 0]], [[54, 0], [50, -5]], [[50, -5], [55, -6]], [[55, -6], [58, -5]], [[58, -5], [51, 1]], [[54, 0], [53, -5]], [[50, -5], [58, -5]], [[55, -6], [58, -2]], [[58, -5], [53, -5]], [[54, 0], [58, -5]], [[50, -5], [58, -2]], [[55, -6], [51, 1]], [[36, -5], [37, 10]], [[37, 10], [33, 11]], [[33, 11], [32, 20]], [[32, 20], [31, 32]], [[31, 32], [28, 34]], [[28, 34], [22, 37]], [[22, 37], [12, 44]], [[12, 44], [12, 51]], [[12, 51], [5, 48]], [[5, 48], [-2, 41]], [[-2, 41], [-11, 40]], [[-11, 40], [-25, 33]], [[-25, 33], [-34, 26]], [[-34, 26], [-34, 18]], [[-34, 18], [-28, 16]], [[-28, 16], [-22, 14]], [[-22, 14], [-15, 12]], [[-15, 12], [-5, 12]], [[-5, 12], [4, 9]], [[4, 9], [5, 0]], [[5, 0], [5, -7]], [[5, -7], [8, -13]], [[8, -13], [12, -16]], [[12, -16], [16, -16]], [[16, -16], [22, -17]], [[22, -17], [28, -13]], [[28, -13], [33, -9]], [[33, -9], [36, -5]], [[36, -5], [36, -5]], [[36, -5], [33, 11]], [[33, 11], [31, 32]], [[31, 32], [22, 37]], [[22, 37], [12, 51]], [[12, 51], [-2, 41]], [[-2, 41], [-25, 33]], [[-25, 33], [-34, 18]], [[-34, 18], [-22, 14]], [[-22, 14], [-5, 12]], [[-5, 12], [5, 0]], [[5, 0], [8, -13]], [[8, -13], [16, -16]], [[16, -16], [28, -13]], [[28, -13], [36, -5]], [[36, -5], [37, 10]], [[36, -5], [32, 20]], [[33, 11], [28, 34]], [[31, 32], [12, 44]], [[22, 37], [5, 48]], [[12, 51], [-11, 40]], [[-2, 41], [-34, 26]], [[-25, 33], [-28, 16]], [[-34, 18], [-15, 12]], [[-22, 14], [4, 9]], [[-5, 12], [5, -7]], [[5, 0], [12, -16]], [[8, -13], [22, -17]], [[16, -16], [33, -9]], [[28, -13], [36, -5]], [[36, -5], [33, 11]], [[36, -5], [28, 34]], [[33, 11], [12, 44]], [[31, 32], [5, 48]], [[22, 37], [-11, 40]], [[12, 51], [-34, 26]], [[-2, 41], [-28, 16]], [[-25, 33], [-15, 12]], [[-34, 18], [4, 9]], [[-22, 14], [5, -7]], [[-5, 12], [12, -16]], [[5, 0], [22, -17]], [[8, -13], [33, -9]], [[16, -16], [36, -5]], [[28, -13], [33, 11]], [[36, -5], [31, 32]], [[-12, 49], [-16, 50]], [[-16, 50], [-25, 47]], [[-25, 47], [-25, 44]], [[-25, 44], [-17, 44]], [[-17, 44], [-12, 49]], [[-12, 49], [-12, 49]], [[-12, 49], [-25, 47]], [[-25, 47], [-17, 44]], [[-17, 44], [-12, 49]], [[-12, 49], [-25, 44]], [[-25, 47], [-12, 49]], [[-17, 44], [-16, 50]], [[-12, 49], [-12, 49]], [[-25, 47], [-16, 50]], [[-17, 44], [-25, 44]], [[77, 105], [73, 80]], [[73, 80], [70, 60]], [[70, 60], [68, 50]], [[68, 50], [60, 40]], [[60, 40], [50, 40]], [[50, 40], [45, 47]], [[45, 47], [40, 50]], [[40, 50], [37, 50]], [[37, 50], [30, 48]], [[30, 48], [25, 55]], [[25, 55], [24, 60]], [[24, 60], [25, 67]], [[25, 67], [20, 70]], [[20, 70], [10, 76]], [[10, 76], [8, 77]], [[8, 77], [13, 80]], [[13, 80], [18, 83]], [[18, 83], [22, 89]], [[22, 89], [22, 92]], [[22, 92], [16, 94]], [[16, 94], [10, 99]], [[10, 99], [5, 103]], [[5, 103], [1, 104]], [[1, 104], [6, 108]], [[6, 108], [11, 109]], [[11, 109], [20, 107]], [[20, 107], [22, 114]], [[22, 114], [25, 119]], [[25, 119], [31, 122]], [[31, 122], [38, 118]], [[38, 118], [40, 124]], [[40, 124], [35, 129]], [[35, 129], [38, 129]], [[38, 129], [42, 131]], [[42, 131], [48, 135]], [[48, 135], [55, 137]], [[55, 137], [60, 145]], [[60, 145], [58, 160]], [[58, 160], [65, 170]], [[65, 170], [66, 179]], [[66, 179], [70, 178]], [[70, 178], [72, 150]], [[72, 150], [75, 135]], [[75, 135], [77, 105]], [[77, 105], [77, 105]], [[77, 105], [70, 60]], [[70, 60], [60, 40]], [[60, 40], [45, 47]], [[45, 47], [37, 50]], [[37, 50], [25, 55]], [[25, 55], [25, 67]], [[25, 67], [10, 76]], [[10, 76], [13, 80]], [[13, 80], [22, 89]], [[22, 89], [16, 94]], [[16, 94], [5, 103]], [[5, 103], [6, 108]], [[6, 108], [20, 107]], [[20, 107], [25, 119]], [[25, 119], [38, 118]], [[38, 118], [35, 129]], [[35, 129], [42, 131]], [[42, 131], [55, 137]], [[55, 137], [58, 160]], [[58, 160], [66, 179]], [[66, 179], [72, 150]], [[72, 150], [77, 105]], [[77, 105], [73, 80]], [[77, 105], [68, 50]], [[70, 60], [50, 40]], [[60, 40], [40, 50]], [[45, 47], [30, 48]], [[37, 50], [24, 60]], [[25, 55], [20, 70]], [[25, 67], [8, 77]], [[10, 76], [18, 83]], [[13, 80], [22, 92]], [[22, 89], [10, 99]], [[16, 94], [1, 104]], [[5, 103], [11, 109]], [[6, 108], [22, 114]], [[20, 107], [31, 122]], [[25, 119], [40, 124]], [[38, 118], [38, 129]], [[35, 129], [48, 135]], [[42, 131], [60, 145]], [[55, 137], [65, 170]], [[58, 160], [70, 178]], [[66, 179], [75, 135]], [[72, 150], [77, 105]], [[77, 105], [70, 60]], [[77, 105], [50, 40]], [[70, 60], [40, 50]], [[60, 40], [30, 48]], [[45, 47], [24, 60]], [[37, 50], [20, 70]], [[25, 55], [8, 77]], [[25, 67], [18, 83]], [[10, 76], [22, 92]], [[13, 80], [10, 99]], [[22, 89], [1, 104]], [[16, 94], [11, 109]], [[5, 103], [22, 114]], [[6, 108], [31, 122]], [[20, 107], [40, 124]], [[25, 119], [38, 129]], [[38, 118], [48, 135]], [[35, 129], [60, 145]], [[42, 131], [65, 170]], [[55, 137], [70, 178]], [[58, 160], [75, 135]], [[66, 179], [77, 105]], [[72, 150], [70, 60]], [[77, 105], [60, 40]], [[45, 142], [43, 145]], [[43, 145], [35, 140]], [[35, 140], [33, 131]], [[33, 131], [34, 133]], [[34, 133], [38, 139]], [[38, 139], [41, 141]], [[41, 141], [45, 142]], [[45, 142], [45, 142]], [[45, 142], [35, 140]], [[35, 140], [34, 133]], [[34, 133], [41, 141]], [[41, 141], [45, 142]], [[45, 142], [33, 131]], [[35, 140], [38, 139]], [[34, 133], [45, 142]], [[41, 141], [43, 145]], [[45, 142], [38, 139]], [[35, 140], [45, 142]], [[34, 133], [43, 145]], [[41, 141], [33, 131]], [[-12, 132], [-12, 136]], [[-12, 136], [-17, 139]], [[-17, 139], [-12, 142]], [[-12, 142], [-18, 146]], [[-18, 146], [-25, 153]], [[-25, 153], [-33, 152]], [[-33, 152], [-38, 146]], [[-38, 146], [-38, 140]], [[-38, 140], [-35, 136]], [[-35, 136], [-32, 132]], [[-32, 132], [-32, 125]], [[-32, 125], [-35, 117]], [[-35, 117], [-32, 115]], [[-32, 115], [-25, 113]], [[-25, 113], [-20, 118]], [[-20, 118], [-16, 123]], [[-16, 123], [-15, 129]], [[-15, 129], [-12, 132]], [[-12, 132], [-12, 132]], [[-12, 132], [-17, 139]], [[-17, 139], [-18, 146]], [[-18, 146], [-33, 152]], [[-33, 152], [-38, 140]], [[-38, 140], [-32, 132]], [[-32, 132], [-35, 117]], [[-35, 117], [-25, 113]], [[-25, 113], [-16, 123]], [[-16, 123], [-12, 132]], [[-12, 132], [-12, 136]], [[-12, 132], [-12, 142]], [[-17, 139], [-25, 153]], [[-18, 146], [-38, 146]], [[-33, 152], [-35, 136]], [[-38, 140], [-32, 125]], [[-32, 132], [-32, 115]], [[-35, 117], [-20, 118]], [[-25, 113], [-15, 129]], [[-16, 123], [-12, 132]], [[-12, 132], [-17, 139]], [[-12, 132], [-25, 153]], [[-17, 139], [-38, 146]], [[-18, 146], [-35, 136]], [[-33, 152], [-32, 125]], [[-38, 140], [-32, 115]], [[-32, 132], [-20, 118]], [[-35, 117], [-15, 129]], [[-25, 113], [-12, 132]], [[-16, 123], [-17, 139]], [[-12, 132], [-18, 146]], [[82, -30], [76, -20]], [[76, -20], [70, -25]], [[70, -25], [60, -44]], [[60, -44], [65, -52]], [[65, -52], [72, -56]], [[72, -56], [78, -68]], [[78, -68], [82, -50]], [[82, -50], [82, -30]], [[82, -30], [82, -30]], [[82, -30], [70, -25]], [[70, -25], [65, -52]], [[65, -52], [78, -68]], [[78, -68], [82, -30]], [[82, -30], [76, -20]], [[82, -30], [60, -44]], [[70, -25], [72, -56]], [[65, -52], [82, -50]], [[78, -68], [82, -30]], [[82, -30], [70, -25]], [[82, -30], [72, -56]], [[70, -25], [82, -50]], [[65, -52], [82, -30]], [[78, -68], [70, -25]], [[82, -30], [65, -52]]]};

  // Strategic population hubs & military communication nodes (night-side tactical micro-dots)
  const STRATEGIC_CITY_LIGHTS = [
    // North America
    { lat: 40.71, lon: -74.00, amber: true },  // NYC
    { lat: 38.90, lon: -77.03, amber: true },  // Washington DC
    { lat: 42.36, lon: -71.05, amber: false }, // Boston
    { lat: 41.87, lon: -87.62, amber: false }, // Chicago
    { lat: 29.76, lon: -95.36, amber: false }, // Houston
    { lat: 34.05, lon: -118.24, amber: true }, // LA
    { lat: 37.77, lon: -122.41, amber: true }, // SF
    { lat: 47.60, lon: -122.33, amber: false },// Seattle
    { lat: 45.50, lon: -73.56, amber: false }, // Montreal
    { lat: 25.76, lon: -80.19, amber: false }, // Miami
    // Europe
    { lat: 51.50, lon: -0.12, amber: true },   // London
    { lat: 48.85, lon: 2.35, amber: false },   // Paris
    { lat: 50.11, lon: 8.68, amber: true },    // Frankfurt
    { lat: 52.52, lon: 13.40, amber: false },  // Berlin
    { lat: 52.36, lon: 4.90, amber: false },   // Amsterdam
    { lat: 41.90, lon: 12.49, amber: false },  // Rome
    { lat: 40.41, lon: -3.70, amber: false },  // Madrid
    { lat: 59.32, lon: 18.06, amber: false },  // Stockholm
    { lat: 55.75, lon: 37.61, amber: true },   // Moscow
    { lat: 59.93, lon: 30.33, amber: false },  // St Petersburg
    { lat: 50.45, lon: 30.52, amber: false },  // Kyiv
    { lat: 41.00, lon: 28.97, amber: false },  // Istanbul
    // Middle East
    { lat: 25.20, lon: 55.27, amber: true },   // Dubai
    { lat: 24.71, lon: 46.67, amber: false },  // Riyadh
    { lat: 32.08, lon: 34.78, amber: true },   // Tel Aviv
    // Asia
    { lat: 39.90, lon: 116.40, amber: true },  // Beijing
    { lat: 31.23, lon: 121.47, amber: true },  // Shanghai
    { lat: 22.31, lon: 114.16, amber: true },  // Hong Kong
    { lat: 35.67, lon: 139.65, amber: true },  // Tokyo
    { lat: 34.69, lon: 135.50, amber: false }, // Osaka
    { lat: 37.56, lon: 126.97, amber: true },  // Seoul
    { lat: 1.35, lon: 103.81, amber: true },   // Singapore
    { lat: 28.61, lon: 77.20, amber: false },  // New Delhi
    { lat: 19.07, lon: 72.87, amber: false },  // Mumbai
    { lat: 13.75, lon: 100.50, amber: false }, // Bangkok
    // Australia & South America
    { lat: -33.86, lon: 151.20, amber: true }, // Sydney
    { lat: -37.81, lon: 144.96, amber: false },// Melbourne
    { lat: -23.55, lon: -46.63, amber: true }, // Sao Paulo
    { lat: -22.90, lon: -43.17, amber: false },// Rio de Janeiro
    { lat: -34.60, lon: -58.38, amber: false } // Buenos Aires
  ];

  class TacticalThreatMap {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      // Tactical command nodes
      this.nodes = [
        { id: 'frankfurt', name: 'Frankfurt [EU-C1]', ip: '198.51.100.42', lat: 50.1109, lon: 8.6821, type: 'primary_target', threat: 85, ports: [22, 80, 443] },
        { id: 'nyc', name: 'New York [US-E1]', ip: '198.18.44.12', lat: 40.7128, lon: -74.0060, type: 'hub', threat: 42, ports: [8080, 443] },
        { id: 'london', name: 'London [UK-S1]', ip: '51.140.22.8', lat: 51.5074, lon: -0.1278, type: 'hub', threat: 28, ports: [443] },
        { id: 'tokyo', name: 'Tokyo [AP-N1]', ip: '133.242.18.5', lat: 35.6762, lon: 139.6503, type: 'hub', threat: 64, ports: [22, 3306] },
        { id: 'sao_paulo', name: 'Sao Paulo [SA-E1]', ip: '177.71.200.15', lat: -23.5505, lon: -46.6333, type: 'hub', threat: 38, ports: [80] },
        { id: 'sydney', name: 'Sydney [AU-S1]', ip: '13.239.50.2', lat: -33.8688, lon: 151.2093, type: 'hub', threat: 19, ports: [443] },
        { id: 'beijing', name: 'Beijing [AS-E1]', ip: '202.108.22.5', lat: 39.9042, lon: 116.4074, type: 'source', threat: 75, ports: [80] },
        { id: 'moscow', name: 'Moscow [RU-C1]', ip: '198.51.100.36', lat: 55.7558, lon: 37.6173, type: 'operator', threat: 10, ports: [443, 22] },
        { id: 'san_francisco', name: 'San Francisco [US-W1]', ip: '104.244.42.1', lat: 37.7749, lon: -122.4194, type: 'source', threat: 50, ports: [443] }
      ];

      // 3D Orbital satellites
      this.satellites = [
        { name: 'USA 245 (KEYHOLE)', orbit: 0, angle: 0.35, speed: 0.0035, color: '#f8fafc' },
        { name: 'COSMOS 2558', orbit: 1, angle: 1.95, speed: 0.0030, color: '#f8fafc' },
        { name: 'YAOGAN 35', orbit: 2, angle: 3.40, speed: 0.0040, color: '#f8fafc' },
        { name: 'ISS (ZARYA)', orbit: 3, angle: 4.80, speed: 0.0032, color: '#f8fafc' },
        { name: 'BEIDOU-3', orbit: 4, angle: 5.40, speed: 0.0028, color: '#f8fafc' }
      ];

      // 3D Orbital planes: inclination and ascending node (Euler tilt angles matching Image 1)
      this.orbits = [
        { inc: 0.72, raan: 0.40, rMult: 1.30, color: 'rgba(255, 255, 255, 0.26)' },
        { inc: -0.65, raan: 1.65, rMult: 1.38, color: 'rgba(255, 255, 255, 0.22)' },
        { inc: 1.15, raan: 2.85, rMult: 1.45, color: 'rgba(255, 255, 255, 0.24)' },
        { inc: -0.32, raan: 3.80, rMult: 1.34, color: 'rgba(255, 255, 255, 0.20)' },
        { inc: 1.42, raan: 5.10, rMult: 1.42, color: 'rgba(255, 255, 255, 0.22)' }
      ];

      // Cyber Attack Arcs
      this.arcs = [
        { from: this.nodes[1], to: this.nodes[0], progress: 0.15, speed: 0.007, color: '#f59e0b' },
        { from: this.nodes[6], to: this.nodes[1], progress: 0.65, speed: 0.006, color: '#00f0ff' },
        { from: this.nodes[8], to: this.nodes[3], progress: 0.35, speed: 0.008, color: '#f59e0b' },
        { from: this.nodes[0], to: this.nodes[4], progress: 0.85, speed: 0.005, color: '#00f0ff' }
      ];

      this.selectedEntity = { kind: 'node', data: this.nodes[0] };
      this.liveSatellites = [];
      this.aircraft = [];
      this.maritime = [];
      this.hotspots = [];

      // Globe camera orientation
      this.yaw = 0.55;
      this.pitch = 0.28;
      this.isDragging = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.pulseTime = 0;

      // Strict energy-efficient timing (Target 30 FPS)
      this.targetFps = 30;
      this.frameInterval = 1000 / this.targetFps;
      this.lastFrameTime = 0;
      this.animId = null;
      this.isPaused = false;

      this.initCanvasSize();
      this.bindEvents();
      this.start();
    }

    initAttackArcs() {
      return this.arcs;
    }

    initCanvasSize() {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const parent = this.canvas.parentElement;
      const parentRect = parent ? parent.getBoundingClientRect() : null;

      const w = Math.max(100, Math.floor(rect.width || (parentRect && parentRect.width) || this.canvas.clientWidth || 500));
      const h = Math.max(100, Math.floor(rect.height || (parentRect && parentRect.height) || this.canvas.clientHeight || 450));
      this.width = w;
      this.height = h;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);

      this.radius = Math.max(35, Math.min(this.width, this.height) * 0.36);
      this.cx = this.width * 0.5;
      this.cy = this.height * 0.5;
    }

    project3D(latDeg, lonDeg, altMult = 1.0) {
      const r = this.radius * altMult;
      const phi = latDeg * (Math.PI / 180);
      const lam = lonDeg * (Math.PI / 180);

      const x = r * Math.cos(phi) * Math.sin(lam - this.yaw);
      const y = -r * Math.sin(phi);
      const z = r * Math.cos(phi) * Math.cos(lam - this.yaw);

      const cosP = Math.cos(this.pitch);
      const sinP = Math.sin(this.pitch);
      const yP = y * cosP - z * sinP;
      const zP = y * sinP + z * cosP;

      return {
        x: this.cx + x,
        y: this.cy + yP,
        z: zP,
        visible: zP > -r * 0.05
      };
    }

    projectVector(x, y, z) {
      const cosY = Math.cos(-this.yaw);
      const sinY = Math.sin(-this.yaw);
      const xR = x * cosY - z * sinY;
      const zR = x * sinY + z * cosY;

      const cosP = Math.cos(this.pitch);
      const sinP = Math.sin(this.pitch);
      const yP = y * cosP - zR * sinP;
      const zP = y * sinP + zR * cosP;

      return {
        x: this.cx + xR,
        y: this.cy + yP,
        z: zP,
        visible: zP > 0
      };
    }

    bindEvents() {
      window.addEventListener('resize', () => this.initCanvasSize());

      if (window.ResizeObserver && this.canvas.parentElement) {
        this.ro = new ResizeObserver((entries) => {
          for (let entry of entries) {
            if (entry.contentRect.width > 20 && entry.contentRect.height > 20) {
              this.initCanvasSize();
            }
          }
        });
        this.ro.observe(this.canvas.parentElement);
      }

      this.canvas.addEventListener('mousedown', (e) => {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        this.yaw -= dx * 0.005;
        this.pitch = Math.max(-0.8, Math.min(0.8, this.pitch - dy * 0.005));
      });

      window.addEventListener('mouseup', () => {
        this.isDragging = false;
      });

      this.canvas.addEventListener('click', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 1. Check tactical ground nodes
        for (let node of this.nodes) {
          const pt = this.project3D(node.lat, node.lon);
          if (!pt.visible) continue;
          if (Math.hypot(mx - pt.x, my - pt.y) <= 14) {
            this.selectedEntity = { kind: 'node', data: node };
            this.updateHudCard(node, 'node');
            return;
          }
        }

        // 2. Check live satellites
        if (this.liveSatellites && this.liveSatellites.length > 0) {
          for (let sat of this.liveSatellites) {
            const pt = this.project3D(sat.lat, sat.lon, 1.25);
            if (!pt.visible) continue;
            if (Math.hypot(mx - pt.x, my - pt.y) <= 14) {
              this.selectedEntity = { kind: 'satellite', data: sat };
              this.updateHudCard(sat, 'satellite');
              return;
            }
          }
        }

        // 3. Check aircraft
        if (this.aircraft && this.aircraft.length > 0) {
          for (let craft of this.aircraft) {
            const pt = this.project3D(craft.lat, craft.lon, 1.05);
            if (!pt.visible) continue;
            if (Math.hypot(mx - pt.x, my - pt.y) <= 12) {
              this.selectedEntity = { kind: 'aircraft', data: craft };
              this.updateHudCard(craft, 'aircraft');
              return;
            }
          }
        }

        // 4. Check maritime vessels
        if (this.maritime && this.maritime.length > 0) {
          for (let ship of this.maritime) {
            const pt = this.project3D(ship.lat, ship.lon, 1.0);
            if (!pt.visible) continue;
            if (Math.hypot(mx - pt.x, my - pt.y) <= 12) {
              this.selectedEntity = { kind: 'maritime', data: ship };
              this.updateHudCard(ship, 'maritime');
              return;
            }
          }
        }

        // 5. Check hotspots
        if (this.hotspots && this.hotspots.length > 0) {
          for (let h of this.hotspots) {
            const pt = this.project3D(h.lat, h.lon, 1.0);
            if (!pt.visible) continue;
            if (Math.hypot(mx - pt.x, my - pt.y) <= 12) {
              this.selectedEntity = { kind: 'hotspot', data: h };
              this.updateHudCard(h, 'hotspot');
              return;
            }
          }
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stop();
        else this.start();
      });

      window.addEventListener('blur', () => {
        this.targetFps = 15;
        this.frameInterval = 1000 / 15;
      });

      window.addEventListener('focus', () => {
        this.targetFps = 30;
        this.frameInterval = 1000 / 30;
      });
    }

    start() {
      if (this.animId) return;
      this.isPaused = false;
      const loop = (timestamp) => {
        if (this.isPaused) return;
        this.animId = requestAnimationFrame(loop);

        const elapsed = timestamp - this.lastFrameTime;
        if (elapsed < this.frameInterval) return;

        this.lastFrameTime = timestamp - (elapsed % this.frameInterval);
        this.render();
      };
      this.animId = requestAnimationFrame(loop);
    }

    stop() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      this.isPaused = true;
    }

    render() {
      if (this.isPaused) return;
      if (this.radius <= 10 || this.width <= 20 || this.height <= 20) return;

      try {
        if (!this.isDragging) {
          this.yaw += 0.0016;
        }
        this.pulseTime += 0.04;

        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const r = this.radius;
        const cx = this.cx;
        const cy = this.cy;

        ctx.clearRect(0, 0, w, h);

        // 1. Deep 3D Spherical Volume Shading
        const rInner = Math.max(0.1, r * 0.05);
        const rOuter = Math.max(1, r);
        const globeGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, rInner, cx, cy, rOuter);
        globeGrad.addColorStop(0, '#0f1422');
        globeGrad.addColorStop(0.5, '#090d18');
        globeGrad.addColorStop(0.85, '#04060c');
        globeGrad.addColorStop(1, '#010204');

        ctx.fillStyle = globeGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

      // 2. Atmospheric Rim Glow Layers
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Delicate Latitude & Longitude Graticule
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      for (let lat = -60; lat <= 60; lat += 30) {
        let started = false;
        for (let lon = -180; lon <= 180; lon += 15) {
          const pt = this.project3D(lat, lon);
          if (pt.visible) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else ctx.lineTo(pt.x, pt.y);
          } else {
            started = false;
          }
        }
      }
      for (let lon = -180; lon < 180; lon += 45) {
        let started = false;
        for (let lat = -80; lat <= 80; lat += 10) {
          const pt = this.project3D(lat, lon);
          if (pt.visible) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else ctx.lineTo(pt.x, pt.y);
          } else {
            started = false;
          }
        }
      }
      ctx.stroke();

      const meshData = window.ARGUS_WORLD_MESH || WORLD_MESH_DATA;

      // 4. Continental Solid Mass Underlay (Gives real physical body to landmasses)
      for (const name in meshData.coastlines) {
        const poly = meshData.coastlines[name];
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < poly.length; i++) {
          const pt = this.project3D(poly[i][0], poly[i][1]);
          if (pt.visible) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.50)';
        ctx.fill();
      }

      // 5. Geodesic Delaunay Wireframe Triangulation Mesh (Authentic Image 1 Appearance)
      ctx.lineWidth = 0.65;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.beginPath();
      const edges = meshData.edges;
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const p1 = this.project3D(e[0][0], e[0][1]);
        const p2 = this.project3D(e[1][0], e[1][1]);
        if (p1.visible && p2.visible) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
      ctx.stroke();

      // 6. Realistic Coastline Contours
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      for (const name in meshData.coastlines) {
        const poly = meshData.coastlines[name];
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < poly.length; i++) {
          const pt = this.project3D(poly[i][0], poly[i][1]);
          if (pt.visible) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else ctx.lineTo(pt.x, pt.y);
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // 6. Strategic Population Hubs (Night-side Tactical City Micro-dots)
      for (let i = 0; i < STRATEGIC_CITY_LIGHTS.length; i++) {
        const c = STRATEGIC_CITY_LIGHTS[i];
        const pt = this.project3D(c.lat, c.lon);
        if (pt.visible) {
          ctx.fillStyle = c.amber ? 'rgba(245, 158, 11, 0.75)' : 'rgba(248, 250, 252, 0.65)';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 7. Back-side of Orbital Satellite Rings
      this.drawOrbitalRings(ctx, false);

      // 8. Great-Circle Ballistic Cyber Attack Arcs
      this.draw3DAttackArcs(ctx);

      // 8b. Real-time Tactical Assets (FIRMS Hotspots, Maritime Fleet, Aircraft)
      this.drawHotspots(ctx);
      this.drawMaritime(ctx);
      this.drawAircraft(ctx);

      // 9. Tactical Ground Nodes
      this.drawGroundNodes(ctx);

      // 10. Front-side of Orbital Satellite Rings & 3D Satellites
      this.drawOrbitalRings(ctx, true);
      this.drawSatellites(ctx);
    } catch (err) {
      console.error('TacticalThreatMap render frame error:', err);
    }
  }

    drawOrbitalRings(ctx, front) {
      const steps = 64;
      for (let i = 0; i < this.orbits.length; i++) {
        const o = this.orbits[i];
        const rOrb = this.radius * o.rMult;

        ctx.strokeStyle = o.color;
        ctx.lineWidth = front ? 0.9 : 0.6;
        ctx.setLineDash(front ? [] : [2, 5]);

        ctx.beginPath();
        let started = false;
        for (let j = 0; j <= steps; j++) {
          const theta = (j / steps) * Math.PI * 2;
          const x0 = rOrb * Math.cos(theta);
          const y0 = rOrb * Math.sin(theta) * Math.sin(o.inc);
          const z0 = rOrb * Math.sin(theta) * Math.cos(o.inc);

          const cosR = Math.cos(o.raan);
          const sinR = Math.sin(o.raan);
          const xOrb = x0 * cosR - z0 * sinR;
          const zOrb = x0 * sinR + z0 * cosR;

          const pt = this.projectVector(xOrb, y0, zOrb);
          const isFront = pt.z >= 0;

          if (isFront === front) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else ctx.lineTo(pt.x, pt.y);
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    drawSatellites(ctx) {
      const satsToRender = (this.liveSatellites && this.liveSatellites.length > 0) ? this.liveSatellites.slice(0, 6) : this.satellites;

      for (let sat of satsToRender) {
        let pt;
        if (sat.lat !== undefined && sat.lon !== undefined) {
          pt = this.project3D(sat.lat, sat.lon, 1.28);
        } else {
          sat.angle = (sat.angle || 0) + (sat.speed || 0.003);
          const o = this.orbits[sat.orbit % this.orbits.length];
          const rOrb = this.radius * o.rMult;

          const x0 = rOrb * Math.cos(sat.angle);
          const y0 = rOrb * Math.sin(sat.angle) * Math.sin(o.inc);
          const z0 = rOrb * Math.sin(sat.angle) * Math.cos(o.inc);

          const cosR = Math.cos(o.raan);
          const sinR = Math.sin(o.raan);
          const xOrb = x0 * cosR - z0 * sinR;
          const zOrb = x0 * sinR + z0 * cosR;

          pt = this.projectVector(xOrb, y0, zOrb);
        }

        if (!pt || !pt.visible) continue;

        // 3D Realistic Wireframe Satellite Model matching Image 1
        ctx.save();
        ctx.translate(pt.x, pt.y);

        // Central Avionics Bus
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 0.8;
        ctx.fillRect(-2.5, -2.5, 5, 5);
        ctx.strokeRect(-2.5, -2.5, 5, 5);

        // Solar Arrays (Left & Right Wings with grid lines)
        ctx.fillStyle = 'rgba(226, 232, 240, 0.22)';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.75;
        // Left Wing
        ctx.fillRect(-9.5, -2, 6, 4);
        ctx.strokeRect(-9.5, -2, 6, 4);
        ctx.beginPath();
        ctx.moveTo(-6.5, -2);
        ctx.lineTo(-6.5, 2);
        ctx.stroke();

        // Right Wing
        ctx.fillRect(3.5, -2, 6, 4);
        ctx.strokeRect(3.5, -2, 6, 4);
        ctx.beginPath();
        ctx.moveTo(6.5, -2);
        ctx.lineTo(6.5, 2);
        ctx.stroke();

        // Nadir Communication Antenna
        ctx.beginPath();
        ctx.moveTo(0, 2.5);
        ctx.lineTo(0, 5.5);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.restore();
      }
    }

    drawAircraft(ctx) {
      if (!this.aircraft || this.aircraft.length === 0) return;
      for (let craft of this.aircraft) {
        const pt = this.project3D(craft.lat, craft.lon, 1.05);
        if (!pt.visible) continue;

        // Tactical Chevron for aircraft
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y - 3);
        ctx.lineTo(pt.x - 2.5, pt.y + 2.5);
        ctx.lineTo(pt.x, pt.y + 1);
        ctx.lineTo(pt.x + 2.5, pt.y + 2.5);
        ctx.closePath();
        ctx.fill();
      }
    }

    drawMaritime(ctx) {
      if (!this.maritime || this.maritime.length === 0) return;
      for (let ship of this.maritime) {
        const pt = this.project3D(ship.lat, ship.lon, 1.0);
        if (!pt.visible) continue;

        // Tactical Diamond for naval vessel
        ctx.fillStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y - 2.5);
        ctx.lineTo(pt.x + 2.5, pt.y);
        ctx.lineTo(pt.x, pt.y + 2.5);
        ctx.lineTo(pt.x - 2.5, pt.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    drawHotspots(ctx) {
      if (!this.hotspots || this.hotspots.length === 0) return;
      for (let h of this.hotspots) {
        const pt = this.project3D(h.lat, h.lon, 1.0);
        if (!pt.visible) continue;

        const pulse = 2.5 + Math.sin(this.pulseTime * 3 + (h.lat || 0)) * 1.5;
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    draw3DAttackArcs(ctx) {
      for (let arc of this.arcs) {
        arc.progress += arc.speed;
        if (arc.progress > 1.0) arc.progress = 0;

        const p1 = this.project3D(arc.from.lat, arc.from.lon);
        const p2 = this.project3D(arc.to.lat, arc.to.lon);
        if (!p1.visible && !p2.visible) continue;

        const steps = 28;
        ctx.beginPath();
        let started = false;

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const lat = arc.from.lat + (arc.to.lat - arc.from.lat) * t;
          const lon = arc.from.lon + (arc.to.lon - arc.from.lon) * t;
          const alt = 1.0 + Math.sin(Math.PI * t) * 0.26;

          const pt = this.project3D(lat, lon, alt);
          if (pt.visible) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else ctx.lineTo(pt.x, pt.y);
          } else {
            started = false;
          }
        }

        ctx.strokeStyle = arc.color === '#00f0ff' ? 'rgba(0, 240, 255, 0.30)' : 'rgba(245, 158, 11, 0.30)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Traveling Kinetic Projectile Head
        const hLat = arc.from.lat + (arc.to.lat - arc.from.lat) * arc.progress;
        const hLon = arc.from.lon + (arc.to.lon - arc.from.lon) * arc.progress;
        const hAlt = 1.0 + Math.sin(Math.PI * arc.progress) * 0.26;
        const hPt = this.project3D(hLat, hLon, hAlt);

        if (hPt.visible) {
          ctx.fillStyle = arc.color;
          ctx.shadowColor = arc.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(hPt.x, hPt.y, 2.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(hPt.x, hPt.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Impact Ping Wave at Destination
        if (p2.visible && arc.progress > 0.85) {
          const waveRadius = (arc.progress - 0.85) * 45;
          ctx.strokeStyle = arc.color;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(p2.x, p2.y, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    drawGroundNodes(ctx) {
      for (let node of this.nodes) {
        const pt = this.project3D(node.lat, node.lon);
        if (!pt.visible) continue;

        const isSelected = this.selectedEntity && this.selectedEntity.data.id === node.id;
        const color = node.threat > 60 ? '#f59e0b' : '#38bdf8';

        if (isSelected) {
          // Tactical Reticle Brackets
          const s = 6;
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          // Top-left
          ctx.moveTo(pt.x - s, pt.y - s + 3); ctx.lineTo(pt.x - s, pt.y - s); ctx.lineTo(pt.x - s + 3, pt.y - s);
          // Top-right
          ctx.moveTo(pt.x + s - 3, pt.y - s); ctx.lineTo(pt.x + s, pt.y - s); ctx.lineTo(pt.x + s, pt.y - s + 3);
          // Bottom-left
          ctx.moveTo(pt.x - s, pt.y + s - 3); ctx.lineTo(pt.x - s, pt.y + s); ctx.lineTo(pt.x - s + 3, pt.y + s);
          // Bottom-right
          ctx.moveTo(pt.x + s - 3, pt.y + s); ctx.lineTo(pt.x + s, pt.y + s); ctx.lineTo(pt.x + s, pt.y + s - 3);
          ctx.stroke();

          // Pulsing Ring
          const pulseR = 7 + Math.sin(this.pulseTime * 2) * 2;
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pulseR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Center Core
        ctx.fillStyle = isSelected ? '#ffffff' : color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSelected ? 2.5 : 2, 0, Math.PI * 2);
        ctx.fill();

        // Label (only when explicitly selected to keep HUD clean like Image 1)
        if (isSelected) {
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(node.name, pt.x + 9, pt.y - 3);
        }
      }
    }

    updateTelemetry(data) {
      if (!data) return;
      if (Array.isArray(data.satellites) && data.satellites.length > 0) {
        this.liveSatellites = data.satellites.map(s => ({
          ...s,
          color: s.country === 'RU' ? '#f59e0b' : (s.country === 'CN' ? '#ef4444' : (s.country === 'US' ? '#38bdf8' : '#10b981'))
        }));
      }
      if (Array.isArray(data.aircraft) && data.aircraft.length > 0) {
        this.aircraft = data.aircraft;
      }
      if (Array.isArray(data.maritime) && data.maritime.length > 0) {
        this.maritime = data.maritime;
      }
      if (Array.isArray(data.hotspots) && data.hotspots.length > 0) {
        this.hotspots = data.hotspots;
      }
    }

    updateHudCard(entity, kind = 'node') {
      const card = document.getElementById('target-hud-card');
      if (card) card.classList.remove('hidden');
      const typeBadge = document.getElementById('hud-type-badge');
      const ipElem = document.getElementById('hud-target-ip');
      const coordsElem = document.getElementById('hud-target-coords');
      const threatElem = document.getElementById('hud-target-threat-score');
      const threatFill = document.getElementById('hud-target-threat-fill');

      if (kind === 'satellite') {
        if (typeBadge) typeBadge.textContent = `NORAD SAT // [${entity.country || 'INTL'}]`;
        if (ipElem) ipElem.textContent = entity.name || entity.id;
        if (coordsElem) coordsElem.textContent = `${Number(entity.lat).toFixed(2)}° N, ${Number(entity.lon).toFixed(2)}° E | Alt: ${entity.altitude_km || 420}km`;
        if (threatElem) threatElem.textContent = `${entity.velocity_kms || 7.6} km/s`;
        if (threatFill) {
          threatFill.style.width = '75%';
          threatFill.className = 'bg-gradient-to-r from-sky-400 to-emerald-400 h-1.5 rounded-full';
        }
      } else if (kind === 'aircraft') {
        if (typeBadge) typeBadge.textContent = `ADS-B RADAR // ${entity.category || 'AIRCRAFT'}`;
        if (ipElem) ipElem.textContent = `${entity.callsign || 'UNKN'} (${entity.model || 'Airframe'})`;
        if (coordsElem) coordsElem.textContent = `${Number(entity.lat).toFixed(2)}° N, ${Number(entity.lon).toFixed(2)}° E | FL${Math.round((entity.altitude_ft || 0) / 100)}`;
        if (threatElem) threatElem.textContent = `${entity.speed_kts || 0} kts`;
        if (threatFill) {
          threatFill.style.width = '65%';
          threatFill.className = 'bg-gradient-to-r from-amber-400 to-sky-400 h-1.5 rounded-full';
        }
      } else if (kind === 'maritime') {
        if (typeBadge) typeBadge.textContent = `AIS FLEET // ${entity.type || 'VESSEL'}`;
        if (ipElem) ipElem.textContent = entity.name;
        if (coordsElem) coordsElem.textContent = `${Number(entity.lat).toFixed(2)}° N, ${Number(entity.lon).toFixed(2)}° E | Crs: ${entity.course || 0}°`;
        if (threatElem) threatElem.textContent = `${entity.speed_kts || 0} kts`;
        if (threatFill) {
          threatFill.style.width = '55%';
          threatFill.className = 'bg-gradient-to-r from-teal-400 to-sky-400 h-1.5 rounded-full';
        }
      } else if (kind === 'hotspot') {
        if (typeBadge) typeBadge.textContent = `THERMAL ANOMALY // ${entity.sensor || 'VIIRS'}`;
        if (ipElem) ipElem.textContent = entity.name;
        if (coordsElem) coordsElem.textContent = `${Number(entity.lat).toFixed(2)}° N, ${Number(entity.lon).toFixed(2)}° E`;
        if (threatElem) threatElem.textContent = `${entity.brightness_k || 350} K`;
        if (threatFill) {
          threatFill.style.width = '90%';
          threatFill.className = 'bg-gradient-to-r from-rose-500 to-amber-500 h-1.5 rounded-full';
        }
      } else {
        if (typeBadge) typeBadge.textContent = 'TACTICAL TARGET INSPECTION';
        if (ipElem) ipElem.textContent = entity.ip;
        if (coordsElem) coordsElem.textContent = `${Number(entity.lat).toFixed(4)}° N, ${Number(entity.lon).toFixed(4)}° E ${entity.name}`;
        if (threatElem) threatElem.textContent = `${entity.threat}%`;
        if (threatFill) {
          threatFill.style.width = `${entity.threat}%`;
          threatFill.className = entity.threat > 70 
            ? 'bg-gradient-to-r from-amber-400 to-rose-500 h-1.5 rounded-full' 
            : 'bg-gradient-to-r from-cyan-400 to-emerald-400 h-1.5 rounded-full';
        }
      }
    }
  }

  window.TacticalThreatMap = TacticalThreatMap;
})();

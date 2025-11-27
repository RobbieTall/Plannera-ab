export type LgaMapInfo = {
  lgaName: string;
  platform: "arcgis" | "intramaps" | "pozi" | "none";
  primaryMapUrl: string | null;
  notes?: string;
};

const LGA_MAPS: LgaMapInfo[] = [
  {
    lgaName: "Albury City Council",
    platform: "intramaps",
    primaryMapUrl: "https://maps.alburycity.nsw.gov.au/intramaps90/",
  },
  {
    lgaName: "Armidale Regional Council",
    platform: "intramaps",
    primaryMapUrl: "https://maps.armidale.nsw.gov.au/intramaps90/",
  },
  {
    lgaName: "Ballina Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://gis.ballina.nsw.gov.au/intramaps90/default.htm",
  },
  {
    lgaName: "Balranald Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://balranaldshire.intramaps.com.au/",
  },
  {
    lgaName: "Bathurst Regional Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.bathurst.nsw.gov.au/Html5Viewer/Index.html?viewer=external",
  },
  {
    lgaName: "Bayside Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.bayside.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Bega Valley Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.begavalley.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Bellingen Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://mapping.bellingen.nsw.gov.au/intramaps90/",
  },
  {
    lgaName: "Berrigan Shire Council",
    platform: "pozi",
    primaryMapUrl: "https://berrigan.pozi.com/",
  },
  {
    lgaName: "Blacktown City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.blacktown.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Bland Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://blandshire.intramaps.com.au/",
  },
  {
    lgaName: "Blayney Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://blayney.intramaps.com.au/",
  },
  {
    lgaName: "Blue Mountains City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.bmcc.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Bogan Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://boganshire.intramaps.com.au/",
  },
  {
    lgaName: "Bourke Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://bourkeshire.intramaps.com.au/",
  },
  {
    lgaName: "Brewarrina Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://brewarrina.intramaps.com.au/",
  },
  {
    lgaName: "Broken Hill City Council",
    platform: "intramaps",
    primaryMapUrl: "https://mapping.brokenhill.nsw.gov.au/intramaps90/",
  },
  {
    lgaName: "Burwood Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.burwood.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Byron Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://byronshire.maps.arcgis.com/home/index.html",
    notes: "Council ArcGIS portal with zoning and overlays",
  },
  {
    lgaName: "Cabonne Council",
    platform: "intramaps",
    primaryMapUrl: "https://cabonne.intramaps.com.au/",
  },
  {
    lgaName: "Camden Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.camden.nsw.gov.au/Html5Viewer/Index.html?viewer=Public",
  },
  {
    lgaName: "Campbelltown City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.campbelltown.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "City of Canada Bay Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.canadabay.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Canada Bay City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.canadabay.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Canterbury-Bankstown Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.cbcity.nsw.gov.au/Html5Viewer/Index.html?viewer=Public",
  },
  {
    lgaName: "Carrathool Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://carrathool.intramaps.com.au/",
  },
  {
    lgaName: "Central Coast Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.centralcoast.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Central Darling Shire Council",
    platform: "none",
    primaryMapUrl: null,
    notes: "No council GIS; use NSW Planning Portal / Spatial Viewer",
  },
  {
    lgaName: "Cessnock City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.cessnock.nsw.gov.au/Html5Viewer/Index.html?viewer=Public",
  },
  {
    lgaName: "Clarence Valley Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.clarence.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Cobar Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://cobarshire.intramaps.com.au/",
  },
  {
    lgaName: "Coffs Harbour City Council",
    platform: "arcgis",
    primaryMapUrl: "https://mapportal.coffsharbour.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Coolamon Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://coolamonshire.intramaps.com.au/",
  },
  {
    lgaName: "Coonamble Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://coonamble.intramaps.com.au/",
  },
  {
    lgaName: "Cootamundra-Gundagai Regional Council",
    platform: "intramaps",
    primaryMapUrl: "https://cgrc.intramaps.com.au/",
  },
  {
    lgaName: "Cowra Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://cowra.intramaps.com.au/",
  },
  {
    lgaName: "Cumberland City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.cumberland.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Dubbo Regional Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.dubbo.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Dungog Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://dungog.intramaps.com.au/",
  },
  {
    lgaName: "Edward River Council",
    platform: "pozi",
    primaryMapUrl: "https://edwardriver.pozi.com/",
  },
  {
    lgaName: "Eurobodalla Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.esc.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Fairfield City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.fairfieldcity.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Federation Council",
    platform: "pozi",
    primaryMapUrl: "https://federation.pozi.com/",
  },
  {
    lgaName: "Forbes Shire Council",
    platform: "pozi",
    primaryMapUrl: "https://forbes.pozi.com/",
  },
  {
    lgaName: "Georges River Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.georgesriver.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Gilgandra Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://gilgandra.intramaps.com.au/",
  },
  {
    lgaName: "Glen Innes Severn Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.gisc.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Goulburn Mulwaree Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.goulburn.nsw.gov.au/Html5Viewer/Index.html?viewer=Public",
  },
  {
    lgaName: "Greater Hume Shire Council",
    platform: "pozi",
    primaryMapUrl: "https://greaterhume.pozi.com/",
  },
  {
    lgaName: "Griffith City Council",
    platform: "intramaps",
    primaryMapUrl: "https://griffith.intramaps.com.au/",
  },
  {
    lgaName: "Gunnedah Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.gunnedah.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Gwydir Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://gwydir.intramaps.com.au/",
  },
  {
    lgaName: "Hawkesbury City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.hawkesbury.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Hay Shire Council",
    platform: "pozi",
    primaryMapUrl: "https://hay.pozi.com/",
  },
  {
    lgaName: "Hilltops Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.hilltops.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Hornsby Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://gis.hornsby.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Hunters Hill Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.huntershill.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Inner West Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.innerwest.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Inverell Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.inverell.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Junee Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://juneeshire.intramaps.com.au/",
  },
  {
    lgaName: "Kempsey Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://mapping.kempsey.nsw.gov.au/intramaps90/",
    notes: "Kempsey public mapping viewer",
  },
  {
    lgaName: "Kiama Municipal Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.kiama.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Ku-ring-gai Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.krg.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Kyogle Council",
    platform: "intramaps",
    primaryMapUrl: "https://mapping.kyogle.nsw.gov.au/intramaps90/",
  },
  {
    lgaName: "Lachlan Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://lachlan.intramaps.com.au/",
  },
  {
    lgaName: "Lake Macquarie City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.lakemac.com.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Lane Cove Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.lanecove.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Leeton Shire Council",
    platform: "pozi",
    primaryMapUrl: "https://leeton.pozi.com/",
  },
  {
    lgaName: "Lismore City Council",
    platform: "intramaps",
    primaryMapUrl: "https://maps.lismore.nsw.gov.au/intramaps90/",
    notes: "Zoning and constraints via IntraMaps",
  },
  {
    lgaName: "Lithgow City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.lithgow.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Liverpool City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.liverpool.nsw.gov.au/Html5Viewer/Index.html?viewer=Public",
  },
  {
    lgaName: "Liverpool Plains Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://lpsc.intramaps.com.au/",
  },
  {
    lgaName: "Lockhart Shire Council",
    platform: "pozi",
    primaryMapUrl: "https://lockhart.pozi.com/",
  },
  {
    lgaName: "Maitland City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.maitland.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Mid-Coast Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.midcoast.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Mid-Western Regional Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.midwestern.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Moree Plains Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://mpsc.intramaps.com.au/",
  },
  {
    lgaName: "Mosman Municipal Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.mosman.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Murray River Council",
    platform: "pozi",
    primaryMapUrl: "https://murrayriver.pozi.com/",
  },
  {
    lgaName: "Murrumbidgee Council",
    platform: "pozi",
    primaryMapUrl: "https://murrumbidgee.pozi.com/",
  },
  {
    lgaName: "Muswellbrook Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.muswellbrook.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Nambucca Valley Council",
    platform: "intramaps",
    primaryMapUrl: "https://mapping.nambucca.nsw.gov.au/intramaps90/",
  },
  {
    lgaName: "Narrabri Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://narrabri.intramaps.com.au/",
  },
  {
    lgaName: "Narrandera Shire Council",
    platform: "pozi",
    primaryMapUrl: "https://narrandera.pozi.com/",
  },
  {
    lgaName: "Narromine Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://narromine.intramaps.com.au/",
  },
  {
    lgaName: "Newcastle City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.newcastle.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "North Sydney Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.northsydney.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Northern Beaches Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.northernbeaches.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Oberon Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.oberon.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Orange City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.orange.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Parramatta City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.cityofparramatta.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Parkes Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://parkes.intramaps.com.au/",
  },
  {
    lgaName: "Penrith City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.penrithcity.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Port Macquarie-Hastings Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.pmhc.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Port Stephens Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.portstephens.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Queanbeyan-Palerang Regional Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.qprc.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Randwick City Council",
    platform: "arcgis",
    primaryMapUrl: "https://rcmaps.randwick.nsw.gov.au/Html5Viewer/Index.html?viewer=Public",
    notes: "ArcGIS HTML5 viewer",
  },
  {
    lgaName: "Richmond Valley Council",
    platform: "intramaps",
    primaryMapUrl: "https://mapping.richmondvalley.nsw.gov.au/intramaps90/",
  },
  {
    lgaName: "Ryde City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.ryde.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "City of Ryde",
    platform: "arcgis",
    primaryMapUrl: "https://maps.ryde.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Shellharbour City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.shellharbour.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Shoalhaven City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.shoalhaven.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Singleton Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.singleton.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Snowy Monaro Regional Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.snowymonaro.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Snowy Valleys Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.snowyvalleys.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Strathfield Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.strathfield.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Sutherland Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.sutherlandshire.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "City of Sydney",
    platform: "arcgis",
    primaryMapUrl: "https://cityofsydney.maps.arcgis.com/apps/webappviewer/index.html?id=3fa414c91a734c5caa55a5c0aa6d5bb1",
    notes: "City of Sydney interactive map",
  },
  {
    lgaName: "Tamworth Regional Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.tamworth.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Temora Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://temora.intramaps.com.au/",
  },
  {
    lgaName: "Tenterfield Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.tenterfield.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "The Hills Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.thehills.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Tweed Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.tweed.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Unincorporated Far West",
    platform: "none",
    primaryMapUrl: null,
    notes: "No council GIS; use NSW Planning Portal / Spatial Viewer",
  },
  {
    lgaName: "Upper Hunter Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.upperhunter.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Upper Lachlan Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://upperlachlan.intramaps.com.au/",
  },
  {
    lgaName: "Uralla Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.uralla.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Wagga Wagga City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.wagga.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Walcha Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.walcha.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Walgett Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://walgett.intramaps.com.au/",
  },
  {
    lgaName: "Warren Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://warren.intramaps.com.au/",
  },
  {
    lgaName: "Warrumbungle Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://warrumbungle.intramaps.com.au/",
  },
  {
    lgaName: "Waverley Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.waverley.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Weddin Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://weddin.intramaps.com.au/",
  },
  {
    lgaName: "Wentworth Shire Council",
    platform: "intramaps",
    primaryMapUrl: "https://wentworth.intramaps.com.au/",
  },
  {
    lgaName: "Willoughby City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.willoughby.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Wingecarribee Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.wsc.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Wollondilly Shire Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.wollondilly.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Wollongong City Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.wollongong.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Woollahra Municipal Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.woollahra.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Yass Valley Council",
    platform: "arcgis",
    primaryMapUrl: "https://maps.yass.nsw.gov.au/Html5Viewer/Index.html?viewer=public",
  },
  {
    lgaName: "Byron Shire",
    platform: "arcgis",
    primaryMapUrl: "https://byronshire.maps.arcgis.com/home/index.html",
  },
  {
    lgaName: "Ballina",
    platform: "intramaps",
    primaryMapUrl: "https://gis.ballina.nsw.gov.au/intramaps90/default.htm",
  },
  {
    lgaName: "Lismore",
    platform: "intramaps",
    primaryMapUrl: "https://maps.lismore.nsw.gov.au/intramaps90/",
  },
  {
    lgaName: "Kempsey",
    platform: "intramaps",
    primaryMapUrl: "https://mapping.kempsey.nsw.gov.au/intramaps90/",
  },
  {
    lgaName: "Randwick",
    platform: "arcgis",
    primaryMapUrl: "https://rcmaps.randwick.nsw.gov.au/Html5Viewer/Index.html?viewer=Public",
  },
  {
    lgaName: "City of Sydney Council",
    platform: "arcgis",
    primaryMapUrl: "https://cityofsydney.maps.arcgis.com/apps/webappviewer/index.html?id=3fa414c91a734c5caa55a5c0aa6d5bb1",
  },
];

const NORMALIZATION_RE = /\b(city of|city|shire|regional|municipal|council|lga)\b/g;

const normalizeLgaName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\bcity of\s+/g, "")
    .replace(NORMALIZATION_RE, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const LGA_MAP_INDEX = new Map<string, LgaMapInfo>();

for (const info of LGA_MAPS) {
  LGA_MAP_INDEX.set(normalizeLgaName(info.lgaName), info);
}

export function getLgaMapInfo(lgaName: string): LgaMapInfo | null {
  if (!lgaName) return null;
  const normalizedQuery = normalizeLgaName(lgaName);
  return LGA_MAP_INDEX.get(normalizedQuery) ?? null;
}

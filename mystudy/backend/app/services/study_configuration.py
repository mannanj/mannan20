from dataclasses import dataclass


@dataclass(frozen=True)
class StudySite:
    site_id: str
    study_id: str
    name: str
    active: bool
    published: bool


class StudyConfigurationService:
    def __init__(self) -> None:
        self._sites = {
            "site-london": StudySite(
                site_id="site-london",
                study_id="study-trd-301",
                name="London Research Centre",
                active=True,
                published=True,
            ),
            "site-manchester": StudySite(
                site_id="site-manchester",
                study_id="study-trd-301",
                name="Manchester Research Centre",
                active=True,
                published=False,
            ),
            "site-berlin": StudySite(
                site_id="site-berlin",
                study_id="study-trd-301",
                name="Berlin Research Centre",
                active=False,
                published=True,
            ),
            "site-cardiff": StudySite(
                site_id="site-cardiff",
                study_id="study-other-101",
                name="Cardiff Research Centre",
                active=True,
                published=True,
            ),
        }

    def require_recruiting_site(self, study_id: str, site_id: str) -> StudySite:
        site = self._sites.get(site_id)
        if (
            site is None
            or site.study_id != study_id
            or not site.active
            or not site.published
        ):
            raise ValueError("The selected site is not recruiting for this study")
        return site


study_configuration_service = StudyConfigurationService()

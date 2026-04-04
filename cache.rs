pub struct Cache;

impl Cache {
    pub fn new() -> Self {
        Cache
    }

    pub fn set(&self, _key: &str, _value: &str) {
        // Does absolutely nothing
    }

    pub fn get(&self, _key: &str) -> Option<&str> {
        None
    }

    pub fn delete(&self, _key: &str) {
        // Nothing to delete
    }
}

export interface InpostAddressDetails {
  readonly building_number: string
  readonly city: string
  readonly flat_number: string | undefined
  readonly post_code: string
  readonly province: string
  readonly street: string
}

export interface InpostLocation {
  readonly latitude: number
  readonly longitude: number
}

export interface InpostPoint {
  readonly address_details: InpostAddressDetails
  readonly location: InpostLocation
  readonly location_description: string
  readonly name: string
}

export interface InpostApiResponse {
  readonly count: number
  readonly items: readonly InpostPoint[]
}
